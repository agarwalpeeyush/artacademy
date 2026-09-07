package com.artacademy.reporting.kafka;

import com.artacademy.common.events.AttendanceRecordedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.reporting.domain.AttendanceSummary;
import com.artacademy.reporting.repository.AttendanceSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceEventConsumer {

    private final AttendanceSummaryRepository attendanceSummaryRepository;

    @KafkaListener(
        topics = KafkaTopics.ATTENDANCE_RECORDED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleAttendanceRecorded(@Payload AttendanceRecordedEvent event) {
        log.info("Received AttendanceRecordedEvent: subjectType={}, subjectId={}, status={}, date={}",
                event.getAttendanceType(), event.getSubjectId(), event.getStatus(), event.getAttendanceDate());

        LocalDate date = LocalDate.parse(event.getAttendanceDate(), DateTimeFormatter.ISO_LOCAL_DATE);
        int month = date.getMonthValue();
        int year = date.getYear();

        AttendanceSummary summary = attendanceSummaryRepository
                .findBySubjectTypeAndSubjectIdAndAttendanceMonthAndAttendanceYear(
                        event.getAttendanceType(), event.getSubjectId(), month, year)
                .orElseGet(() -> AttendanceSummary.builder()
                        .subjectType(event.getAttendanceType())
                        .subjectId(event.getSubjectId())
                        .subjectName("Unknown")  // name resolved on StudentReport/TeacherReport creation
                        .attendanceMonth(month)
                        .attendanceYear(year)
                        .build());

        summary.setTotalDays(summary.getTotalDays() + 1);

        switch (event.getStatus().toUpperCase()) {
            case "PRESENT" -> summary.setPresentDays(summary.getPresentDays() + 1);
            case "ABSENT"  -> summary.setAbsentDays(summary.getAbsentDays() + 1);
            case "LEAVE"   -> summary.setLeaveDays(summary.getLeaveDays() + 1);
            default        -> log.warn("Unknown attendance status: {}", event.getStatus());
        }

        attendanceSummaryRepository.save(summary);
        log.debug("Upserted AttendanceSummary for subjectType={}, subjectId={}, month={}/{}",
                event.getAttendanceType(), event.getSubjectId(), month, year);
    }
}
