package com.artacademy.payment.service;

import com.artacademy.common.events.FeeGeneratedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.FeeCadence;
import com.artacademy.payment.client.EnrollmentServiceClient;
import com.artacademy.payment.domain.EnrollmentStatus;
import com.artacademy.payment.domain.FeeBill;
import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.FeeType;
import com.artacademy.payment.domain.StudentFee;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.dto.FeeGenerateResponse;
import com.artacademy.payment.mapper.PaymentMapper;
import com.artacademy.payment.repository.FeeBillRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import com.artacademy.payment.repository.StudentFeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Materialises {@link FeeBill}s from the fee catalogue on an explicit action — never at enroll
 * time and never on a cron. One-time types skip if already billed; MONTHLY bills the current
 * month plus an optional missing-month back-fill; EXAM is billed only by the principal batch.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BillGenerationService {

    private final StudentFeeRepository studentFeeRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final FeeBillRepository feeBillRepository;
    private final EnrollmentServiceClient enrollmentServiceClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final PaymentMapper paymentMapper;
    private final Clock clock;

    /**
     * Generate bills for one enrollment. ADMISSION / ONE_TIME_SHORT_TERM are billed once;
     * MONTHLY always ensures the current month and — when {@code generateMissing} — back-fills
     * every month from the enrollment date to today. EXAM is never billed here.
     */
    @Transactional
    public FeeGenerateResponse generateOnEnroll(UUID enrollmentId, boolean generateMissing) {
        StudentFee header = studentFeeRepository.findById(enrollmentId)
                .orElseThrow(() -> ApiException.notFound(
                        "No enrollment fee record for enrollmentId: " + enrollmentId));
        if (header.getStatus() != EnrollmentStatus.ACTIVE) {
            throw ApiException.badRequest("Cannot generate bills for a " + header.getStatus() + " enrollment");
        }

        FeeGenerateResponse response = FeeGenerateResponse.builder().build();
        List<StudentFeeDetail> details = feeDetailRepository.findByEnrollmentId(enrollmentId);
        YearMonth currentMonth = YearMonth.now(clock);

        for (StudentFeeDetail detail : details) {
            switch (detail.getFeeType()) {
                case ADMISSION, ONE_TIME_SHORT_TERM ->
                        generateOneTime(header, detail, response);
                case MONTHLY ->
                        generateMonthly(header, detail, currentMonth, generateMissing, response);
                case EXAM -> {
                    // Never billed on enroll — the principal batch-bills the cohort.
                }
            }
        }
        return response;
    }

    private void generateOneTime(StudentFee header, StudentFeeDetail detail, FeeGenerateResponse response) {
        if (feeBillRepository.existsByEnrollmentIdAndFeeType(header.getEnrollmentId(), detail.getFeeType())) {
            response.getAlreadyBilled().add(detail.getFeeType().name());
            return;
        }
        LocalDateTime due = detail.getDueDate() != null
                ? detail.getDueDate().atTime(LocalTime.MAX.withNano(0))
                : null;
        FeeBill bill = createBill(header, detail, 0, 0, due);
        response.getGenerated().add(decorate(bill));
    }

    private void generateMonthly(StudentFee header, StudentFeeDetail detail, YearMonth currentMonth,
                                 boolean generateMissing, FeeGenerateResponse response) {
        List<YearMonth> monthsToBill = new ArrayList<>();

        if (generateMissing) {
            LocalDate enrollDate = enrollmentServiceClient.fetchEnrollmentDate(header.getEnrollmentId());
            if (enrollDate != null) {
                YearMonth cursor = YearMonth.from(enrollDate);
                while (!cursor.isAfter(currentMonth)) {
                    monthsToBill.add(cursor);
                    cursor = cursor.plusMonths(1);
                }
            } else {
                log.warn("No enrollment date for enrollmentId={}; billing current month only",
                        header.getEnrollmentId());
                monthsToBill.add(currentMonth);
            }
        } else {
            monthsToBill.add(currentMonth);
            LocalDate enrollDate = enrollmentServiceClient.fetchEnrollmentDate(header.getEnrollmentId());
            if (enrollDate != null) {
                YearMonth cursor = YearMonth.from(enrollDate);
                while (cursor.isBefore(currentMonth)) {
                    if (!feeBillRepository.existsByEnrollmentIdAndFeeTypeAndBillingMonthAndBillingYear(
                            header.getEnrollmentId(), FeeType.MONTHLY,
                            cursor.getMonthValue(), cursor.getYear())) {
                        response.addMissingMonth(cursor);
                    }
                    cursor = cursor.plusMonths(1);
                }
            }
        }

        for (YearMonth ym : monthsToBill) {
            if (feeBillRepository.existsByEnrollmentIdAndFeeTypeAndBillingMonthAndBillingYear(
                    header.getEnrollmentId(), FeeType.MONTHLY, ym.getMonthValue(), ym.getYear())) {
                continue;
            }
            LocalDateTime due = ym.atEndOfMonth().atTime(LocalTime.MAX.withNano(0));
            FeeBill bill = createBill(header, detail, ym.getMonthValue(), ym.getYear(), due);
            response.getGenerated().add(decorate(bill));
        }
    }

    /**
     * Batch-bill the EXAM cohort of a course (principal action). For each enrollment in the course
     * that carries an EXAM catalogue line, create one EXAM bill; already-billed enrollments skip.
     */
    @Transactional
    public List<FeeBill> generateExamBills(UUID courseId) {
        List<UUID> enrollmentIds = enrollmentServiceClient.fetchEnrollmentIdsForCourse(courseId);
        List<FeeBill> created = new ArrayList<>();

        for (UUID enrollmentId : enrollmentIds) {
            StudentFee header = studentFeeRepository.findById(enrollmentId).orElse(null);
            if (header == null || header.getStatus() != EnrollmentStatus.ACTIVE) {
                continue;
            }
            StudentFeeDetail exam = feeDetailRepository
                    .findByEnrollmentIdAndFeeType(enrollmentId, FeeType.EXAM)
                    .orElse(null);
            if (exam == null) {
                continue;
            }
            if (feeBillRepository.existsByEnrollmentIdAndFeeType(enrollmentId, FeeType.EXAM)) {
                continue;
            }
            LocalDateTime due = exam.getDueDate() != null
                    ? exam.getDueDate().atTime(LocalTime.MAX.withNano(0))
                    : null;
            created.add(createBill(header, exam, 0, 0, due));
        }
        log.info("Generated {} EXAM bill(s) for courseId={}", created.size(), courseId);
        return created;
    }

    /** Persists one bill from a catalogue line, copying the frozen share rule, then publishes. */
    private FeeBill createBill(StudentFee header, StudentFeeDetail detail,
                               int billingMonth, int billingYear, LocalDateTime dueDate) {
        BigDecimal amount = detail.getAmount() != null ? detail.getAmount() : BigDecimal.ZERO;
        FeeBill bill = FeeBill.builder()
                .enrollmentId(header.getEnrollmentId())
                .studentId(header.getStudentId())
                .billingMonth(billingMonth)
                .billingYear(billingYear)
                .feeType(detail.getFeeType())
                .cadence(detail.getCadence())
                .amountDue(amount)
                .paidAmount(BigDecimal.ZERO)
                .outstandingAmount(amount)
                .status(FeeStatus.UNPAID)
                .generatedDate(LocalDateTime.now(clock))
                .dueDate(dueDate)
                .outstandingBill(Boolean.TRUE)
                .teacherId(header.getTeacherId())
                .instituteShareType(detail.getInstituteShareType())
                .instituteShareValue(detail.getInstituteShareValue())
                .build();
        bill = feeBillRepository.save(bill);

        FeeGeneratedEvent event = FeeGeneratedEvent.builder()
                .feeCycleId(bill.getId())
                .studentId(bill.getStudentId())
                .billingMonth(bill.getBillingMonth())
                .billingYear(bill.getBillingYear())
                .totalAmount(bill.getAmountDue())
                .occurredAt(java.time.Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.FEE_GENERATED, bill.getStudentId().toString(), event);

        log.info("Generated {} bill id={} for enrollmentId={} (month={}, year={}, amount={})",
                bill.getFeeType(), bill.getId(), bill.getEnrollmentId(),
                billingMonth, billingYear, amount);
        return bill;
    }

    private com.artacademy.payment.dto.FeeBillResponse decorate(FeeBill bill) {
        return BillDecorator.decorate(bill, paymentMapper, clock);
    }
}
