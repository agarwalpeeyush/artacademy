package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.ClassSession;
import com.artacademy.attendance.domain.ClassSessionStatus;
import com.artacademy.attendance.domain.AttendanceStatus;
import com.artacademy.attendance.domain.TeacherAttendance;
import com.artacademy.attendance.dto.TeacherAttendanceRequest;
import com.artacademy.attendance.dto.TeacherAttendanceResponse;
import com.artacademy.attendance.dto.TeacherRangeAttendanceRequest;
import com.artacademy.attendance.mapper.TeacherAttendanceMapper;
import com.artacademy.attendance.repository.ClassSessionRepository;
import com.artacademy.attendance.repository.TeacherAttendanceRepository;
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
import java.util.ArrayList;
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
    private final ClassSessionRepository classSessionRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Upsert attendance: update if a record already exists for the teacher+class+date,
     * otherwise create a new one. A teacher taking two classes on the same day therefore
     * gets two rows (R11).
     */
    public TeacherAttendanceResponse markAttendance(TeacherAttendanceRequest request) {
        Optional<TeacherAttendance> existing =
                teacherAttendanceRepository.findByTeacherIdAndClassIdAndAttendanceDate(
                        request.getTeacherId(), request.getClassId(), request.getAttendanceDate());

        TeacherAttendance attendance;
        if (existing.isPresent()) {
            attendance = existing.get();
            teacherAttendanceMapper.updateEntityFromRequest(request, attendance);
            log.info("Updating teacher attendance id={} for teacherId={} classId={} date={}",
                    attendance.getId(), request.getTeacherId(), request.getClassId(),
                    request.getAttendanceDate());
        } else {
            attendance = teacherAttendanceMapper.toEntity(request);
            log.info("Creating teacher attendance for teacherId={} classId={} date={}",
                    request.getTeacherId(), request.getClassId(), request.getAttendanceDate());
        }

        TeacherAttendance saved = teacherAttendanceRepository.save(attendance);
        publishRecorded(saved);
        return teacherAttendanceMapper.toResponse(saved);
    }

    /**
     * Bulk-mark teacher attendance for one class across a date range (R11 / G4). Writes one row
     * per (teacher, class, session day) for every scheduled, non-CANCELLED ClassSession of the
     * class in [fromDate, toDate]. Existing rows are updated; missing ones inserted. Idempotent.
     */
    public List<TeacherAttendanceResponse> markClassAttendanceForRange(UUID classId,
                                                                       TeacherRangeAttendanceRequest request) {
        if (request.getFromDate().isAfter(request.getToDate())) {
            throw ApiException.badRequest(
                    "fromDate " + request.getFromDate() + " must not be after toDate " + request.getToDate());
        }

        List<ClassSession> sessions = classSessionRepository
                .findByClassIdAndSessionDateBetween(classId, request.getFromDate(), request.getToDate())
                .stream()
                .filter(s -> s.getStatus() != ClassSessionStatus.CANCELLED)
                .toList();

        List<TeacherAttendanceResponse> results = new ArrayList<>();
        for (ClassSession session : sessions) {
            UUID courseId = request.getCourseId() != null ? request.getCourseId() : session.getCourseId();
            for (UUID teacherId : request.getTeacherIds()) {
                TeacherAttendance record = teacherAttendanceRepository
                        .findByTeacherIdAndClassIdAndAttendanceDate(teacherId, classId, session.getSessionDate())
                        .orElseGet(() -> TeacherAttendance.builder()
                                .teacherId(teacherId)
                                .classId(classId)
                                .attendanceDate(session.getSessionDate())
                                .build());
                record.setCourseId(courseId);
                record.setStatus(request.getDefaultStatus());
                record.setRemarks(request.getRemarks());

                TeacherAttendance saved = teacherAttendanceRepository.save(record);
                publishRecorded(saved);
                results.add(teacherAttendanceMapper.toResponse(saved));
            }
        }
        return results;
    }

    /**
     * List teacher attendance rows for a class on a specific date (all teachers on that day).
     */
    @Transactional(readOnly = true)
    public List<TeacherAttendanceResponse> getByClassAndDate(UUID classId, LocalDate date) {
        return teacherAttendanceRepository.findByClassIdAndAttendanceDate(classId, date)
                .stream()
                .map(teacherAttendanceMapper::toResponse)
                .toList();
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

    /**
     * Apply a corrected status to an existing teacher attendance record and publish
     * ATTENDANCE_UPDATED. Used by the direct-edit (R16) path.
     */
    public TeacherAttendance applyCorrection(UUID attendanceId, AttendanceStatus newStatus) {
        TeacherAttendance record = teacherAttendanceRepository.findById(attendanceId)
                .orElseThrow(() -> ApiException.notFound("Teacher attendance record not found: " + attendanceId));
        AttendanceStatus oldStatus = record.getStatus();
        record.setStatus(newStatus);
        TeacherAttendance saved = teacherAttendanceRepository.save(record);
        publishUpdated(saved, oldStatus);
        return saved;
    }

    private void publishUpdated(TeacherAttendance saved, AttendanceStatus oldStatus) {
        com.artacademy.common.events.AttendanceUpdatedEvent event =
                com.artacademy.common.events.AttendanceUpdatedEvent.builder()
                        .attendanceType("TEACHER")
                        .subjectId(saved.getTeacherId())
                        .oldStatus(oldStatus.name())
                        .newStatus(saved.getStatus().name())
                        .attendanceDate(saved.getAttendanceDate().toString())
                        .courseId(saved.getCourseId())
                        .occurredAt(Instant.now())
                        .build();
        kafkaTemplate.send(KafkaTopics.ATTENDANCE_UPDATED, saved.getTeacherId().toString(), event);
        log.info("Published AttendanceUpdatedEvent for teacherId={} {}->{}",
                saved.getTeacherId(), oldStatus, saved.getStatus());
    }

    private void publishRecorded(TeacherAttendance saved) {
        AttendanceRecordedEvent event = AttendanceRecordedEvent.builder()
                .attendanceType("TEACHER")
                .subjectId(saved.getTeacherId())
                .status(saved.getStatus().name())
                .attendanceDate(saved.getAttendanceDate().toString())
                .courseId(saved.getCourseId())
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ATTENDANCE_RECORDED,
                saved.getTeacherId().toString(), event);
        log.info("Published AttendanceRecordedEvent for teacherId={} classId={}",
                saved.getTeacherId(), saved.getClassId());
    }
}
