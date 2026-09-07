package com.artacademy.payment.kafka;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.payment.domain.EnrollmentCache;
import com.artacademy.payment.repository.EnrollmentCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnrollmentEventConsumer {

    private final EnrollmentCacheRepository enrollmentCacheRepository;

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CREATED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleEnrollmentCreated(@Payload EnrollmentCreatedEvent event) {
        log.info("Received EnrollmentCreatedEvent: enrollmentId={}, studentId={}, courseId={}",
                event.getEnrollmentId(), event.getStudentId(), event.getCourseId());

        EnrollmentCache cache = enrollmentCacheRepository.findById(event.getEnrollmentId())
                .orElse(EnrollmentCache.builder()
                        .enrollmentId(event.getEnrollmentId())
                        .build());

        cache.setStudentId(event.getStudentId());
        cache.setCourseId(event.getCourseId());
        // courseFee is not part of EnrollmentCreatedEvent — default to zero if not present,
        // will be updated via separate fee-update events when available.
        if (cache.getCourseFee() == null) {
            cache.setCourseFee(java.math.BigDecimal.ZERO);
        }
        cache.setStatus("ACTIVE");

        enrollmentCacheRepository.save(cache);
        log.info("Upserted EnrollmentCache for enrollmentId={}", event.getEnrollmentId());
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
