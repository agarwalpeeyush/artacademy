package com.artacademy.payment.kafka;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import com.artacademy.payment.domain.EnrollmentCache;
import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.repository.EnrollmentCacheRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import com.artacademy.payment.service.AdmissionFeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnrollmentEventConsumer {

    private final EnrollmentCacheRepository enrollmentCacheRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final AdmissionFeeService admissionFeeService;

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CREATED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleEnrollmentCreated(@Payload EnrollmentCreatedEvent event) {
        log.info("Received EnrollmentCreatedEvent: enrollmentId={}, studentId={}, courseId={}, teacherId={}",
                event.getEnrollmentId(), event.getStudentId(), event.getCourseId(), event.getTeacherId());

        List<EnrollmentCreatedEvent.FeeItem> fees = event.getFees() != null ? event.getFees() : List.of();

        // Recurring fees drive the monthly batch generator; sum them into COURSE_FEE.
        BigDecimal recurringTotal = fees.stream()
                .filter(f -> f.getCadence() == FeeCadence.RECURRING)
                .map(f -> f.getAmount() != null ? f.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // The monthly line carries the share rule stamped onto each monthly-generated detail.
        EnrollmentCreatedEvent.FeeItem recurringLine = fees.stream()
                .filter(f -> f.getCadence() == FeeCadence.RECURRING)
                .findFirst()
                .orElse(null);

        EnrollmentCache cache = enrollmentCacheRepository.findById(event.getEnrollmentId())
                .orElse(EnrollmentCache.builder()
                        .enrollmentId(event.getEnrollmentId())
                        .build());

        cache.setStudentId(event.getStudentId());
        cache.setCourseId(event.getCourseId());
        cache.setCourseFee(recurringTotal);
        cache.setStatus("ACTIVE");
        cache.setTeacherId(event.getTeacherId());
        if (recurringLine != null) {
            cache.setInstituteShareType(recurringLine.getInstituteShareType());
            cache.setInstituteShareValue(recurringLine.getInstituteShareValue());
        }

        enrollmentCacheRepository.save(cache);
        log.info("Upserted EnrollmentCache for enrollmentId={} (recurringTotal={})",
                event.getEnrollmentId(), recurringTotal);

        // One-time fees are billed now — EXCEPT EXAM, which is triggered when the principal
        // schedules the exam (Group M), not at enrollment.
        for (EnrollmentCreatedEvent.FeeItem fee : fees) {
            if (fee.getCadence() == FeeCadence.ONE_TIME && fee.getFeeType() != FeeType.EXAM) {
                admissionFeeService.generateOneTimeDue(event, fee);
            }
        }

        // F13: a re-published event (child's fee/share edited before payment) updates the
        // not-yet-paid details in place; PAID details are frozen and change only via override.
        updateUnpaidDetails(event, recurringLine);
    }

    /**
     * F13: refresh the teacher attribution and frozen share rule (and the billed amount, for
     * recurring lines) on the enrollment's not-yet-paid details. PAID details are left untouched.
     */
    private void updateUnpaidDetails(EnrollmentCreatedEvent event,
                                     EnrollmentCreatedEvent.FeeItem recurringLine) {
        List<StudentFeeDetail> details = feeDetailRepository.findByEnrollmentId(event.getEnrollmentId());
        for (StudentFeeDetail detail : details) {
            if (detail.getStatus() == FeeStatus.PAID) {
                continue;
            }
            detail.setTeacherId(event.getTeacherId());
            if (recurringLine != null) {
                detail.setInstituteShareType(recurringLine.getInstituteShareType());
                detail.setInstituteShareValue(recurringLine.getInstituteShareValue());
            }
            feeDetailRepository.save(detail);
        }
        if (!details.isEmpty()) {
            log.info("F13: refreshed share rule on {} not-yet-paid detail(s) for enrollmentId={}",
                    details.size(), event.getEnrollmentId());
        }
    }

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CANCELLED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleEnrollmentCancelled(@Payload EnrollmentCancelledEvent event) {
        log.info("Received EnrollmentCancelledEvent: enrollmentId={}, studentId={}",
                event.getEnrollmentId(), event.getStudentId());

        enrollmentCacheRepository.findById(event.getEnrollmentId()).ifPresentOrElse(cache -> {
            cache.setStatus("CANCELLED");
            enrollmentCacheRepository.save(cache);
            log.info("Marked EnrollmentCache as CANCELLED for enrollmentId={}", event.getEnrollmentId());
        }, () -> log.warn("EnrollmentCache not found for enrollmentId={} during cancellation",
                event.getEnrollmentId()));
    }
}
