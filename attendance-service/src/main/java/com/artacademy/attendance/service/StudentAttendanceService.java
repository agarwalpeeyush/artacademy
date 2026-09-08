package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.ClassSession;
import com.artacademy.attendance.domain.StudentAttendance;
import com.artacademy.attendance.dto.StudentAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceResponse;
import com.artacademy.attendance.dto.StudentAttendanceStatsResponse;
import com.artacademy.attendance.domain.AttendanceStatus;
import com.artacademy.attendance.mapper.StudentAttendanceMapper;
import com.artacademy.attendance.repository.StudentAttendanceRepository;
import com.artacademy.common.events.AttendanceRecordedEvent;
import com.artacademy.common.events.AttendanceUpdatedEvent;
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
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentAttendanceService {

    private final StudentAttendanceRepository studentAttendanceRepository;
    private final StudentAttendanceMapper studentAttendanceMapper;
    private final ClassSessionService classSessionService;
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

        StudentAttendance saved = insertRecord(request);
        publishRecorded(saved);
        return studentAttendanceMapper.toResponse(saved);
    }

    /**
     * Bulk upsert: for each request, update the existing record for
     * student+class+date (firing ATTENDANCE_UPDATED) or insert a new one
     * (firing ATTENDANCE_RECORDED). Safe to re-submit.
     */
    public List<StudentAttendanceResponse> markAttendanceBulk(List<StudentAttendanceRequest> requests) {
        return requests.stream().map(request -> {
            Optional<StudentAttendance> existing = studentAttendanceRepository
                    .findByStudentIdAndClassIdAndAttendanceDate(
                            request.getStudentId(), request.getClassId(), request.getAttendanceDate());

            if (existing.isPresent()) {
                StudentAttendance record = existing.get();
                AttendanceStatus oldStatus = record.getStatus();
                record.setStatus(request.getStatus());
                record.setRemarks(request.getRemarks());
                StudentAttendance saved = studentAttendanceRepository.save(record);
                publishUpdated(saved, oldStatus);
                return studentAttendanceMapper.toResponse(saved);
            }

            StudentAttendance saved = insertRecord(request);
            publishRecorded(saved);
            return studentAttendanceMapper.toResponse(saved);
        }).toList();
    }

    /**
     * Update status/remarks of a single record; publishes ATTENDANCE_UPDATED.
     */
    public StudentAttendanceResponse updateAttendance(UUID id, StudentAttendanceRequest request) {
        StudentAttendance record = studentAttendanceRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Attendance record not found: " + id));

        AttendanceStatus oldStatus = record.getStatus();
        record.setStatus(request.getStatus());
        if (request.getRemarks() != null) {
            record.setRemarks(request.getRemarks());
        }
        StudentAttendance saved = studentAttendanceRepository.save(record);
        publishUpdated(saved, oldStatus);
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

    /**
     * List attendance records for a class on a specific date.
     */
    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getByClassAndDate(UUID classId, LocalDate date) {
        return studentAttendanceRepository.findByClassIdAndAttendanceDate(classId, date)
                .stream()
                .map(studentAttendanceMapper::toResponse)
                .toList();
    }

    /**
     * Compute attendance stats for a student, optionally scoped to one class.
     */
    @Transactional(readOnly = true)
    public StudentAttendanceStatsResponse getStats(UUID studentId, UUID classId) {
        List<StudentAttendance> records = (classId != null)
                ? studentAttendanceRepository.findByStudentIdAndClassId(studentId, classId)
                : studentAttendanceRepository.findByStudentId(studentId);

        long total = records.size();
        long present = records.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
        long absent = records.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
        long leave = records.stream().filter(r -> r.getStatus() == AttendanceStatus.LEAVE).count();
        long half = records.stream().filter(r -> r.getStatus() == AttendanceStatus.HALF_DAY).count();
        double pct = total == 0 ? 0.0
                : Math.round(((present + half * 0.5) / total) * 1000.0) / 10.0;

        return StudentAttendanceStatsResponse.builder()
                .studentId(studentId)
                .totalDays(total)
                .presentDays(present)
                .absentDays(absent)
                .leaveDays(leave)
                .halfDays(half)
                .attendancePercentage(pct)
                .build();
    }

    /**
     * Apply a corrected status to an existing record and publish ATTENDANCE_UPDATED.
     * Used by the correction-approval workflow.
     */
    public StudentAttendanceResponse applyCorrection(UUID attendanceId, AttendanceStatus newStatus) {
        StudentAttendance record = studentAttendanceRepository.findById(attendanceId)
                .orElseThrow(() -> ApiException.notFound("Attendance record not found: " + attendanceId));
        AttendanceStatus oldStatus = record.getStatus();
        record.setStatus(newStatus);
        StudentAttendance saved = studentAttendanceRepository.save(record);
        publishUpdated(saved, oldStatus);
        return studentAttendanceMapper.toResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private StudentAttendance insertRecord(StudentAttendanceRequest request) {
        ClassSession session = classSessionService.resolveOrCreate(
                request.getClassId(), request.getCourseId(), request.getAttendanceDate());

        StudentAttendance attendance = studentAttendanceMapper.toEntity(request);
        attendance.setSessionId(session.getId());
        if (attendance.getCourseId() == null) {
            attendance.setCourseId(session.getCourseId());
        }
        StudentAttendance saved = studentAttendanceRepository.save(attendance);
        log.info("Created student attendance id={} for studentId={} classId={} date={} sessionId={}",
                saved.getId(), saved.getStudentId(), saved.getClassId(),
                saved.getAttendanceDate(), saved.getSessionId());
        return saved;
    }

    private void publishRecorded(StudentAttendance saved) {
        AttendanceRecordedEvent event = AttendanceRecordedEvent.builder()
                .attendanceType("STUDENT")
                .subjectId(saved.getStudentId())
                .status(saved.getStatus().name())
                .attendanceDate(saved.getAttendanceDate().toString())
                .courseId(saved.getCourseId())
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ATTENDANCE_RECORDED,
                saved.getStudentId().toString(), event);
        log.info("Published AttendanceRecordedEvent for studentId={}", saved.getStudentId());
    }

    private void publishUpdated(StudentAttendance saved, AttendanceStatus oldStatus) {
        AttendanceUpdatedEvent event = AttendanceUpdatedEvent.builder()
                .attendanceType("STUDENT")
                .subjectId(saved.getStudentId())
                .oldStatus(oldStatus.name())
                .newStatus(saved.getStatus().name())
                .attendanceDate(saved.getAttendanceDate().toString())
                .courseId(saved.getCourseId())
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ATTENDANCE_UPDATED,
                saved.getStudentId().toString(), event);
        log.info("Published AttendanceUpdatedEvent for studentId={} {}->{}",
                saved.getStudentId(), oldStatus, saved.getStatus());
    }
}
