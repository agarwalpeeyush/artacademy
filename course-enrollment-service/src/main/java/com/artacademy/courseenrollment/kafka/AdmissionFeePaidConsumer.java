package com.artacademy.courseenrollment.kafka;

import com.artacademy.common.events.AdmissionFeePaidEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdmissionFeePaidConsumer {

    private final EnrollmentRepository enrollmentRepository;

    @KafkaListener(
        topics = KafkaTopics.ADMISSION_FEE_PAID,
        groupId = "${spring.kafka.consumer.group-id:course-enrollment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleAdmissionFeePaid(@Payload AdmissionFeePaidEvent event) {
        log.info("Received AdmissionFeePaidEvent: enrollmentId={}, studentId={}",
                event.getEnrollmentId(), event.getStudentId());

        enrollmentRepository.findById(event.getEnrollmentId()).ifPresentOrElse(enrollment -> {
            if (enrollment.isAdmissionFeePaid()) {
                log.info("Enrollment id={} already marked admissionFeePaid; skipping",
                        event.getEnrollmentId());
                return;
            }
            enrollment.setAdmissionFeePaid(true);
            enrollmentRepository.save(enrollment);
            log.info("Marked admissionFeePaid=true for enrollment id={}", event.getEnrollmentId());
        }, () -> log.warn("Enrollment not found for id={} while processing AdmissionFeePaidEvent",
                event.getEnrollmentId()));
    }
}
