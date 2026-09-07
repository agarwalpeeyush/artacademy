package com.artacademy.reporting.kafka;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.StudentCreatedEvent;
import com.artacademy.common.events.TeacherCreatedEvent;
import com.artacademy.reporting.domain.StudentReport;
import com.artacademy.reporting.domain.TeacherReport;
import com.artacademy.reporting.repository.StudentReportRepository;
import com.artacademy.reporting.repository.TeacherReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventConsumer {

    private final StudentReportRepository studentReportRepository;
    private final TeacherReportRepository teacherReportRepository;

    @KafkaListener(
        topics = KafkaTopics.STUDENT_CREATED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleStudentCreated(@Payload StudentCreatedEvent event) {
        log.info("Received StudentCreatedEvent: studentId={}, firstName={}, lastName={}",
                event.getStudentId(), event.getFirstName(), event.getLastName());

        studentReportRepository.findByStudentId(event.getStudentId()).ifPresentOrElse(
                existing -> log.warn("StudentReport already exists for studentId={}", event.getStudentId()),
                () -> {
                    StudentReport report = StudentReport.builder()
                            .studentId(event.getStudentId())
                            .firstName(event.getFirstName())
                            .lastName(event.getLastName())
                            .build();
                    studentReportRepository.save(report);
                    log.info("Created StudentReport for studentId={}", event.getStudentId());
                }
        );
    }

    @KafkaListener(
        topics = KafkaTopics.TEACHER_CREATED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleTeacherCreated(@Payload TeacherCreatedEvent event) {
        log.info("Received TeacherCreatedEvent: teacherId={}, employeeCode={}, firstName={}, lastName={}",
                event.getTeacherId(), event.getEmployeeCode(), event.getFirstName(), event.getLastName());

        teacherReportRepository.findByTeacherId(event.getTeacherId()).ifPresentOrElse(
                existing -> log.warn("TeacherReport already exists for teacherId={}", event.getTeacherId()),
                () -> {
                    TeacherReport report = TeacherReport.builder()
                            .teacherId(event.getTeacherId())
                            .employeeCode(event.getEmployeeCode())
                            .firstName(event.getFirstName())
                            .lastName(event.getLastName())
                            .build();
                    teacherReportRepository.save(report);
                    log.info("Created TeacherReport for teacherId={}", event.getTeacherId());
                }
        );
    }
}
