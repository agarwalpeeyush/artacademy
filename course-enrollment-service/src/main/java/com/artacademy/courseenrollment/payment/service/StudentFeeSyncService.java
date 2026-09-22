package com.artacademy.courseenrollment.payment.service;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.ExamScheduledEvent;
import com.artacademy.common.fee.FeeCadence;
import com.artacademy.courseenrollment.payment.domain.EnrollmentStatus;
import com.artacademy.courseenrollment.payment.domain.FeeType;
import com.artacademy.courseenrollment.payment.domain.StudentFee;
import com.artacademy.courseenrollment.payment.domain.StudentFeeDetail;
import com.artacademy.courseenrollment.payment.repository.FeeBillRepository;
import com.artacademy.courseenrollment.payment.repository.StudentFeeDetailRepository;
import com.artacademy.courseenrollment.payment.repository.StudentFeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Store-only sync of the fee catalogue (StudentFee header + StudentFeeDetail lines) from the
 * enrollment/exam domain. Formerly driven by Kafka consumers in payment-service; now that the
 * two domains share a process, the enrollment/exam flows call these methods directly in-transaction.
 * The methods accept the same event payloads that are still published to Kafka for reporting/
 * notification, so there is a single source of truth for the data shape.
 *
 * <p>No bill is ever materialised here: it upserts the header and refreshes not-yet-billed detail
 * lines idempotently. A line already billed for its type is frozen (F4); a re-sync (fee edited
 * before payment) refreshes the remaining lines (F13).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudentFeeSyncService {

    private final StudentFeeRepository studentFeeRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final FeeBillRepository feeBillRepository;

    /** Upsert the StudentFee header and re-sync its not-yet-billed detail lines to the enrollment. */
    public void upsertFromEnrollment(EnrollmentCreatedEvent event) {
        log.info("Syncing fee catalogue for enrollmentId={}, studentId={}, courseId={}, teacherId={}",
                event.getEnrollmentId(), event.getStudentId(), event.getCourseId(), event.getTeacherId());

        StudentFee header = studentFeeRepository.findById(event.getEnrollmentId())
                .orElse(StudentFee.builder()
                        .enrollmentId(event.getEnrollmentId())
                        .build());
        header.setStudentId(event.getStudentId());
        header.setCourseId(event.getCourseId());
        header.setTeacherId(event.getTeacherId());
        header.setStatus(EnrollmentStatus.ACTIVE);
        studentFeeRepository.save(header);

        List<EnrollmentCreatedEvent.FeeItem> fees = event.getFees() != null ? event.getFees() : List.of();
        for (EnrollmentCreatedEvent.FeeItem fee : fees) {
            FeeType feeType = parseFeeType(fee.getFeeType());
            if (feeType == null) {
                log.warn("Unknown fee type '{}' on enrollmentId={}, skipping",
                        fee.getFeeType(), event.getEnrollmentId());
                continue;
            }
            if (feeBillRepository.existsByEnrollmentIdAndFeeType(event.getEnrollmentId(), feeType)) {
                continue;
            }
            StudentFeeDetail detail = feeDetailRepository
                    .findByEnrollmentIdAndFeeType(event.getEnrollmentId(), feeType)
                    .orElse(StudentFeeDetail.builder()
                            .enrollmentId(event.getEnrollmentId())
                            .feeType(feeType)
                            .build());
            detail.setAmount(fee.getAmount());
            detail.setCadence(fee.getCadence());
            detail.setDueDate(fee.getDueDate());
            detail.setInstituteShareType(fee.getInstituteShareType());
            detail.setInstituteShareValue(fee.getInstituteShareValue());
            feeDetailRepository.save(detail);
        }
        log.info("Stored {} fee line(s) for enrollmentId={}", fees.size(), event.getEnrollmentId());
    }

    /** Mark the enrollment's fee header CANCELLED; existing bills are left as-is. */
    public void markCancelled(EnrollmentCancelledEvent event) {
        studentFeeRepository.findById(event.getEnrollmentId()).ifPresentOrElse(header -> {
            header.setStatus(EnrollmentStatus.CANCELLED);
            studentFeeRepository.save(header);
            log.info("Marked enrollment {} CANCELLED (bills left as-is)", event.getEnrollmentId());
        }, () -> log.warn("No StudentFee for enrollmentId={} during cancellation",
                event.getEnrollmentId()));
    }

    /** Upsert an EXAM one-time detail line per enrolled student; no bill is created here. */
    public void upsertExamFee(ExamScheduledEvent event) {
        List<ExamScheduledEvent.EnrolledStudent> students =
                event.getStudents() != null ? event.getStudents() : List.of();
        log.info("Syncing EXAM fee: examId={}, courseId={}, {} enrolled students, feeAmount={}",
                event.getExamId(), event.getCourseId(), students.size(), event.getFeeAmount());

        LocalDate dueDate = event.getExamDate();
        for (ExamScheduledEvent.EnrolledStudent student : students) {
            StudentFeeDetail detail = feeDetailRepository
                    .findByEnrollmentIdAndFeeType(student.getEnrollmentId(), FeeType.EXAM)
                    .orElse(StudentFeeDetail.builder()
                            .enrollmentId(student.getEnrollmentId())
                            .feeType(FeeType.EXAM)
                            .cadence(FeeCadence.ONE_TIME)
                            .build());
            detail.setAmount(event.getFeeAmount());
            detail.setCadence(FeeCadence.ONE_TIME);
            detail.setDueDate(dueDate);
            feeDetailRepository.save(detail);
        }
        log.info("Upserted EXAM fee line for {} student(s) on courseId={}",
                students.size(), event.getCourseId());
    }

    private static FeeType parseFeeType(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return FeeType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
