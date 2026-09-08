package com.artacademy.reporting.kafka;

import com.artacademy.common.events.AttendanceRecordedEvent;
import com.artacademy.common.events.AttendanceUpdatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.reporting.domain.AttendanceSummary;
import com.artacademy.reporting.repository.AttendanceSummaryRepository;
import com.artacademy.reporting.repository.StudentReportRepository;
import com.artacademy.reporting.repository.TeacherReportRepository;
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
    private final TeacherReportRepository teacherReportRepository;
    private final StudentReportRepository studentReportRepository;

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

        AttendanceSummary summary = findOrCreate(event.getAttendanceType(),
                event.getSubjectId(), month, year);

        if (event.getCourseId() != null) {
            summary.setCourseId(event.getCourseId());
        }
        if (event.getCourseName() != null) {
            summary.setCourseName(event.getCourseName());
        }

        summary.setTotalDays(summary.getTotalDays() + 1);
        increment(summary, event.getStatus());

        attendanceSummaryRepository.save(summary);
        log.debug("Upserted AttendanceSummary (recorded) for subjectType={}, subjectId={}, month={}/{}",
                event.getAttendanceType(), event.getSubjectId(), month, year);
    }

    @KafkaListener(
        topics = KafkaTopics.ATTENDANCE_UPDATED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleAttendanceUpdated(@Payload AttendanceUpdatedEvent event) {
        log.info("Received AttendanceUpdatedEvent: subjectType={}, subjectId={}, {}->{}, date={}",
                event.getAttendanceType(), event.getSubjectId(),
                event.getOldStatus(), event.getNewStatus(), event.getAttendanceDate());

        if (event.getOldStatus() != null
                && event.getOldStatus().equalsIgnoreCase(event.getNewStatus())) {
            log.debug("Status unchanged ({}); no summary adjustment", event.getNewStatus());
            return;
        }

        LocalDate date = LocalDate.parse(event.getAttendanceDate(), DateTimeFormatter.ISO_LOCAL_DATE);
        int month = date.getMonthValue();
        int year = date.getYear();

        AttendanceSummary summary = findOrCreate(event.getAttendanceType(),
                event.getSubjectId(), month, year);

        if (event.getCourseId() != null) {
            summary.setCourseId(event.getCourseId());
        }
        if (event.getCourseName() != null) {
            summary.setCourseName(event.getCourseName());
        }

        // Move one day from the old status bucket to the new; totalDays unchanged.
        decrement(summary, event.getOldStatus());
        increment(summary, event.getNewStatus());

        attendanceSummaryRepository.save(summary);
        log.debug("Upserted AttendanceSummary (updated) for subjectType={}, subjectId={}, month={}/{}",
                event.getAttendanceType(), event.getSubjectId(), month, year);
    }

    // -------------------------------------------------------------------------

    private AttendanceSummary findOrCreate(String type, java.util.UUID subjectId, int month, int year) {
        AttendanceSummary summary = attendanceSummaryRepository
                .findBySubjectTypeAndSubjectIdAndAttendanceMonthAndAttendanceYear(type, subjectId, month, year)
                .orElseGet(() -> AttendanceSummary.builder()
                        .subjectType(type)
                        .subjectId(subjectId)
                        .subjectName("Unknown")
                        .attendanceMonth(month)
                        .attendanceYear(year)
                        .build());

        // Backfill the name from the report projections once it becomes available.
        if (summary.getSubjectName() == null || "Unknown".equals(summary.getSubjectName())) {
            resolveName(type, subjectId).ifPresent(summary::setSubjectName);
        }
        return summary;
    }

    private java.util.Optional<String> resolveName(String type, java.util.UUID subjectId) {
        if ("TEACHER".equalsIgnoreCase(type)) {
            return teacherReportRepository.findByTeacherId(subjectId)
                    .map(t -> fullName(t.getFirstName(), t.getLastName()));
        }
        return studentReportRepository.findByStudentId(subjectId)
                .map(s -> fullName(s.getFirstName(), s.getLastName()));
    }

    private String fullName(String first, String last) {
        String name = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
        return name.isBlank() ? null : name;
    }

    private void increment(AttendanceSummary summary, String status) {
        switch (status.toUpperCase()) {
            case "PRESENT"  -> summary.setPresentDays(summary.getPresentDays() + 1);
            case "ABSENT"   -> summary.setAbsentDays(summary.getAbsentDays() + 1);
            case "LEAVE"    -> summary.setLeaveDays(summary.getLeaveDays() + 1);
            case "HALF_DAY" -> summary.setPresentDays(summary.getPresentDays() + 1);
            default         -> log.warn("Unknown attendance status: {}", status);
        }
    }

    private void decrement(AttendanceSummary summary, String status) {
        if (status == null) return;
        switch (status.toUpperCase()) {
            case "PRESENT"  -> summary.setPresentDays(Math.max(0, summary.getPresentDays() - 1));
            case "ABSENT"   -> summary.setAbsentDays(Math.max(0, summary.getAbsentDays() - 1));
            case "LEAVE"    -> summary.setLeaveDays(Math.max(0, summary.getLeaveDays() - 1));
            case "HALF_DAY" -> summary.setPresentDays(Math.max(0, summary.getPresentDays() - 1));
            default         -> log.warn("Unknown attendance status: {}", status);
        }
    }
}
