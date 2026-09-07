package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.TeacherAttendance;
import com.artacademy.attendance.dto.TeacherAttendanceRequest;
import com.artacademy.attendance.dto.TeacherAttendanceResponse;
import com.artacademy.attendance.mapper.TeacherAttendanceMapper;
import com.artacademy.attendance.repository.TeacherAttendanceRepository;
import com.artacademy.common.events.AttendanceRecordedEvent;
import com.artacademy.common.events.KafkaTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeacherAttendanceService {

    private final TeacherAttendanceRepository teacherAttendanceRepository;
    private final TeacherAttendanceMapper teacherAttendanceMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Upsert attendance: update if a record already exists for the teacher+date,
     * otherwise create a new one.
     */
    public TeacherAttendanceResponse markAttendance(TeacherAttendanceRequest request) {
        Optional<TeacherAttendance> existing =
                teacherAttendanceRepository.findByTeacherIdAndAttendanceDate(
                        request.getTeacherId(), request.getAttendanceDate());

        TeacherAttendance attendance;
        if (existing.isPresent()) {
            attendance = existing.get();
            teacherAttendanceMapper.updateEntityFromRequest(request, attendance);
            log.info("Updating teacher attendance id={} for teacherId={} date={}",
                    attendance.getId(), request.getTeacherId(), request.getAttendanceDate());
        } else {
            attendance = teacherAttendanceMapper.toEntity(request);
            log.info("Creating teacher attendance for teacherId={} date={}",
                    request.getTeacherId(), request.getAttendanceDate());
        }

        TeacherAttendance saved = teacherAttendanceRepository.save(attendance);

        AttendanceRecordedEvent event = AttendanceRecordedEvent.builder()
                .attendanceType("TEACHER")
                .status(saved.getStatus().name())
                .attendanceDate(saved.getAttendanceDate().toString())
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ATTENDANCE_RECORDED,
                saved.getTeacherId().toString(), event);
        log.info("Published AttendanceRecordedEvent for teacherId={}", saved.getTeacherId());

        return teacherAttendanceMapper.toResponse(saved);
    }

    /**
     * Get all attendance records for a teacher. When both from and to are provided,
     * the result is filtered to that date range.
     */
    @Transactional(readOnly = true)
    public List<TeacherAttendanceResponse> getByTeacher(UUID teacherId,
                                                         LocalDate from,
                                                         LocalDate to) {
        List<TeacherAttendance> records;
        if (from != null && to != null) {
            records = teacherAttendanceRepository
                    .findByTeacherIdAndAttendanceDateBetween(teacherId, from, to);
        } else {
            records = teacherAttendanceRepository.findByTeacherId(teacherId);
        }
        return records.stream()
                .map(teacherAttendanceMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<TeacherAttendanceResponse> getByTeacherAndDate(UUID teacherId,
                                                                    LocalDate date) {
        return teacherAttendanceRepository
                .findByTeacherIdAndAttendanceDate(teacherId, date)
                .map(teacherAttendanceMapper::toResponse);
    }
}
