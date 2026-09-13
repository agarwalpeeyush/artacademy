package com.artacademy.payment.service;

import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.ExamScheduledEvent;
import com.artacademy.common.events.FeeGeneratedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.FeeType;
import com.artacademy.payment.domain.FeeCycleKind;
import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.StudentFeeCycle;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.repository.StudentFeeCycleRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

/**
 * Generates one-time fee dues (ADMISSION, ONE_TIME_SHORT_TERM) at enrollment time.
 * EXAM (also one-time) is deliberately NOT generated here — it is triggered when the principal
 * schedules the exam (see the exam-fee-trigger flow, Group M).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdmissionFeeService {

    private final StudentFeeCycleRepository feeCycleRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Generates a one-time fee due for an enrollment. Idempotent per (enrollment, cycle kind),
     * so event redelivery or re-enroll-after-cancel will not create duplicates.
     */
    @Transactional
    public void generateOneTimeDue(EnrollmentCreatedEvent event, EnrollmentCreatedEvent.FeeItem fee) {
        FeeCycleKind kind = toCycleKind(fee.getFeeType());
        BigDecimal amount = fee.getAmount();
        if (amount == null || amount.signum() <= 0) {
            log.info("No {} fee to bill for enrollmentId={} (amount={})",
                    kind, event.getEnrollmentId(), amount);
            return;
        }

        if (feeDetailRepository.existsByEnrollmentIdAndFeeCycle_CycleKind(event.getEnrollmentId(), kind)) {
            log.info("{} due already exists for enrollmentId={}; skipping", kind, event.getEnrollmentId());
            return;
        }

        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int year = today.getYear();
        LocalDateTime generatedDate = LocalDateTime.now();
        LocalDateTime dueDate = YearMonth.of(year, month).atEndOfMonth().atTime(23, 59, 59);

        StudentFeeCycle cycle = StudentFeeCycle.builder()
                .studentId(event.getStudentId())
                .billingMonth(month)
                .billingYear(year)
                .cycleKind(kind)
                .totalAmount(amount)
                .paidAmount(BigDecimal.ZERO)
                .outstandingAmount(amount)
                .status(FeeStatus.UNPAID)
                .generatedDate(generatedDate)
                .dueDate(dueDate)
                .build();

        cycle = feeCycleRepository.save(cycle);

        StudentFeeDetail detail = StudentFeeDetail.builder()
                .feeCycle(cycle)
                .studentId(event.getStudentId())
                .enrollmentId(event.getEnrollmentId())
                .courseId(event.getCourseId())
                .courseFee(amount)
                .allocatedPaidAmount(BigDecimal.ZERO)
                .outstandingAmount(amount)
                .status(FeeStatus.UNPAID)
                .build();

        feeDetailRepository.save(detail);
        cycle.setDetails(List.of(detail));

        FeeGeneratedEvent feeEvent = FeeGeneratedEvent.builder()
                .feeCycleId(cycle.getId())
                .studentId(event.getStudentId())
                .billingMonth(month)
                .billingYear(year)
                .totalAmount(amount)
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.FEE_GENERATED, event.getStudentId().toString(), feeEvent);
        log.info("Generated {} due cycleId={} for studentId={}, enrollmentId={}, amount={}",
                kind, cycle.getId(), event.getStudentId(), event.getEnrollmentId(), amount);
    }

    /**
     * Generates a one-time EXAM fee due for one enrolled student when a principal schedules an exam
     * (Group M / R19). Idempotent per (enrollment, EXAM, examId) via {@code sourceRef}, so a student
     * enrolled in two exams in the same month gets two distinct cycles, while event redelivery is a
     * no-op.
     */
    @Transactional
    public void generateExamDue(ExamScheduledEvent event, ExamScheduledEvent.EnrolledStudent student) {
        BigDecimal amount = event.getFeeAmount();
        if (amount == null || amount.signum() <= 0) {
            log.info("No EXAM fee to bill for examId={} (amount={})", event.getExamId(), amount);
            return;
        }

        if (feeDetailRepository.existsByEnrollmentIdAndFeeCycle_CycleKindAndFeeCycle_SourceRef(
                student.getEnrollmentId(), FeeCycleKind.EXAM, event.getExamId())) {
            log.info("EXAM due already exists for enrollmentId={}, examId={}; skipping",
                    student.getEnrollmentId(), event.getExamId());
            return;
        }

        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int year = today.getYear();
        LocalDateTime generatedDate = LocalDateTime.now();
        LocalDateTime dueDate = YearMonth.of(year, month).atEndOfMonth().atTime(23, 59, 59);

        StudentFeeCycle cycle = StudentFeeCycle.builder()
                .studentId(student.getStudentId())
                .billingMonth(month)
                .billingYear(year)
                .cycleKind(FeeCycleKind.EXAM)
                .sourceRef(event.getExamId())
                .totalAmount(amount)
                .paidAmount(BigDecimal.ZERO)
                .outstandingAmount(amount)
                .status(FeeStatus.UNPAID)
                .generatedDate(generatedDate)
                .dueDate(dueDate)
                .build();

        cycle = feeCycleRepository.save(cycle);

        StudentFeeDetail detail = StudentFeeDetail.builder()
                .feeCycle(cycle)
                .studentId(student.getStudentId())
                .enrollmentId(student.getEnrollmentId())
                .courseId(event.getCourseId())
                .courseFee(amount)
                .allocatedPaidAmount(BigDecimal.ZERO)
                .outstandingAmount(amount)
                .status(FeeStatus.UNPAID)
                .build();

        feeDetailRepository.save(detail);
        cycle.setDetails(List.of(detail));

        FeeGeneratedEvent feeEvent = FeeGeneratedEvent.builder()
                .feeCycleId(cycle.getId())
                .studentId(student.getStudentId())
                .billingMonth(month)
                .billingYear(year)
                .totalAmount(amount)
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.FEE_GENERATED, student.getStudentId().toString(), feeEvent);
        log.info("Generated EXAM due cycleId={} for studentId={}, enrollmentId={}, examId={}, amount={}",
                cycle.getId(), student.getStudentId(), student.getEnrollmentId(), event.getExamId(), amount);
    }

    /**
     * Maps a shared {@link FeeType} to the payment-service {@link FeeCycleKind}. Unknown types
     * fail loudly rather than being silently skipped (E4).
     */
    private FeeCycleKind toCycleKind(FeeType feeType) {
        return switch (feeType) {
            case ADMISSION -> FeeCycleKind.ADMISSION;
            case ONE_TIME_SHORT_TERM -> FeeCycleKind.ONE_TIME_SHORT_TERM;
            case EXAM -> FeeCycleKind.EXAM;
            case MONTHLY -> throw ApiException.badRequest(
                    "MONTHLY is a recurring fee and cannot be generated as a one-time due");
        };
    }
}
