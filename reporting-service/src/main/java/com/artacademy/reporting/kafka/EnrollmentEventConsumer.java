package com.artacademy.reporting.kafka;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.reporting.repository.StudentReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnrollmentEventConsumer {

    private final StudentReportRepository studentReportRepository;

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CREATED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleEnrollmentCreated(@Payload EnrollmentCreatedEvent event) {
        log.info("Received EnrollmentCreatedEvent: enrollmentId={}, studentId={}",
                event.getEnrollmentId(), event.getStudentId());

        studentReportRepository.findByStudentId(event.getStudentId()).ifPresentOrElse(
                report -> {
                    report.setTotalEnrollments(report.getTotalEnrollments() + 1);
                    studentReportRepository.save(report);
                    log.debug("Incremented totalEnrollments for studentId={} to {}",
                            event.getStudentId(), report.getTotalEnrollments());
                },
                () -> log.warn("StudentReport not found for studentId={} when processing EnrollmentCreated",
                        event.getStudentId())
        );
    }

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CANCELLED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleEnrollmentCancelled(@Payload EnrollmentCancelledEvent event) {
        log.info("Received EnrollmentCancelledEvent: enrollmentId={}, studentId={}",
                event.getEnrollmentId(), event.getStudentId());

        studentReportRepository.findByStudentId(event.getStudentId()).ifPresentOrElse(
                report -> {
                    int updated = Math.max(0, report.getTotalEnrollments() - 1);
                    report.setTotalEnrollments(updated);
                    studentReportRepository.save(report);
                    log.debug("Decremented totalEnrollments for studentId={} to {}",
                            event.getStudentId(), updated);
                },
                () -> log.warn("StudentReport not found for studentId={} when processing EnrollmentCancelled",
                        event.getStudentId())
        );
    }
}
