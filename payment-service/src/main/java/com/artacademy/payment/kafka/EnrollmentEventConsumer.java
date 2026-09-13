package com.artacademy.payment.kafka;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import com.artacademy.payment.domain.EnrollmentCache;
import com.artacademy.payment.repository.EnrollmentCacheRepository;
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
    private final AdmissionFeeService admissionFeeService;

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CREATED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleEnrollmentCreated(@Payload EnrollmentCreatedEvent event) {
        log.info("Received EnrollmentCreatedEvent: enrollmentId={}, studentId={}, courseId={}",
                event.getEnrollmentId(), event.getStudentId(), event.getCourseId());

        List<EnrollmentCreatedEvent.FeeItem> fees = event.getFees() != null ? event.getFees() : List.of();

        // Recurring fees drive the monthly batch generator; sum them into COURSE_FEE.
        BigDecimal recurringTotal = fees.stream()
                .filter(f -> f.getCadence() == FeeCadence.RECURRING)
                .map(f -> f.getAmount() != null ? f.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        EnrollmentCache cache = enrollmentCacheRepository.findById(event.getEnrollmentId())
                .orElse(EnrollmentCache.builder()
                        .enrollmentId(event.getEnrollmentId())
                        .build());

        cache.setStudentId(event.getStudentId());
        cache.setCourseId(event.getCourseId());
        cache.setCourseFee(recurringTotal);
        cache.setStatus("ACTIVE");

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
