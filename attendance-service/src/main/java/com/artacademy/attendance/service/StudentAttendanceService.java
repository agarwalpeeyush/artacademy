package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.StudentAttendance;
import com.artacademy.attendance.dto.StudentAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceResponse;
import com.artacademy.attendance.mapper.StudentAttendanceMapper;
import com.artacademy.attendance.repository.StudentAttendanceRepository;
import com.artacademy.common.events.AttendanceRecordedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentAttendanceService {

    private final StudentAttendanceRepository studentAttendanceRepository;
    private final StudentAttendanceMapper studentAttendanceMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Mark attendance for a student. Rejects duplicate entries for the same
     * student + class + date combination.
     */
    public StudentAttendanceResponse markAttendance(StudentAttendanceRequest request) {
        boolean duplicate = studentAttendanceRepository.existsByStudentIdAndClassIdAndAttendanceDate(
                request.getStudentId(), request.getClassId(), request.getAttendanceDate());

        if (duplicate) {
            throw ApiException.conflict(
                    "Attendance already recorded for studentId=" + request.getStudentId()
                    + ", classId=" + request.getClassId()
                    + ", date=" + request.getAttendanceDate());
        }

        StudentAttendance attendance = studentAttendanceMapper.toEntity(request);
        StudentAttendance saved = studentAttendanceRepository.save(attendance);
        log.info("Created student attendance id={} for studentId={} classId={} date={}",
                saved.getId(), saved.getStudentId(), saved.getClassId(), saved.getAttendanceDate());

        AttendanceRecordedEvent event = AttendanceRecordedEvent.builder()
                .attendanceType("STUDENT")
                .status(saved.getStatus().name())
                .attendanceDate(saved.getAttendanceDate().toString())
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ATTENDANCE_RECORDED,
                saved.getStudentId().toString(), event);
        log.info("Published AttendanceRecordedEvent for studentId={}", saved.getStudentId());

        return studentAttendanceMapper.toResponse(saved);
    }

    /**
     * Get all attendance records for a student. When both from and to are provided,
     * the result is filtered to that date range.
     */
    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getByStudent(UUID studentId,
                                                         LocalDate from,
                                                         LocalDate to) {
        List<StudentAttendance> records;
        if (from != null && to != null) {
            records = studentAttendanceRepository
                    .findByStudentIdAndAttendanceDateBetween(studentId, from, to);
        } else {
            records = studentAttendanceRepository.findByStudentId(studentId);
        }
        return records.stream()
                .map(studentAttendanceMapper::toResponse)
                .toList();
    }
}
