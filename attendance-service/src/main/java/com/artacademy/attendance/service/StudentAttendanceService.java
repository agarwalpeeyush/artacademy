package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.StudentAttendance;
import com.artacademy.attendance.dto.StudentAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceResponse;
import com.artacademy.attendance.dto.StudentAttendanceStatsResponse;
import com.artacademy.attendance.dto.TimetableRangeAttendanceRequest;
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
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Mark attendance for a student on a timetable slot. Rejects duplicate entries for the same
     * student + timetable slot + date combination.
     */
    public StudentAttendanceResponse markAttendance(StudentAttendanceRequest request) {
        boolean duplicate = studentAttendanceRepository.existsByStudentIdAndTimetableIdAndAttendanceDate(
                request.getStudentId(), request.getTimetableId(), request.getAttendanceDate());

        if (duplicate) {
            throw ApiException.conflict(
                    "Attendance already recorded for studentId=" + request.getStudentId()
                    + ", timetableId=" + request.getTimetableId()
                    + ", date=" + request.getAttendanceDate());
        }

        StudentAttendance saved = insertRecord(request);
        publishRecorded(saved);
        return studentAttendanceMapper.toResponse(saved);
    }

    /**
     * Bulk upsert: for each request, update the existing record for
     * student+timetable+date (firing ATTENDANCE_UPDATED) or insert a new one
     * (firing ATTENDANCE_RECORDED). Safe to re-submit.
     */
    public List<StudentAttendanceResponse> markAttendanceBulk(List<StudentAttendanceRequest> requests) {
        return requests.stream().map(request -> {
            Optional<StudentAttendance> existing = studentAttendanceRepository
                    .findByStudentIdAndTimetableIdAndAttendanceDate(
                            request.getStudentId(), request.getTimetableId(), request.getAttendanceDate());

            if (existing.isPresent()) {
                StudentAttendance record = existing.get();
                AttendanceStatus oldStatus = record.getStatus();
                record.setStatus(request.getStatus());
                record.setRemarks(request.getRemarks());
                record.setStartTime(request.getStartTime());
                record.setEndTime(request.getEndTime());
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
     * Bulk-mark a timetable slot's roster across an explicit set of session dates (R10). The
     * frontend supplies the dates that fall on the slot's weekday (decision 8.3). Each
     * student+date pair is upserted: existing records are updated (ATTENDANCE_UPDATED), missing
     * ones inserted (ATTENDANCE_RECORDED). Safe to re-submit.
     */
    public List<StudentAttendanceResponse> markTimetableAttendanceForRange(UUID timetableId,
                                                                           TimetableRangeAttendanceRequest request) {
        List<StudentAttendanceResponse> results = new java.util.ArrayList<>();
        for (LocalDate date : request.getSessionDates()) {
            for (UUID studentId : request.getStudentIds()) {
                StudentAttendanceRequest attendanceRequest = StudentAttendanceRequest.builder()
                        .studentId(studentId)
                        .courseId(request.getCourseId())
                        .timetableId(timetableId)
                        .attendanceDate(date)
                        .status(request.getDefaultStatus())
                        .startTime(request.getStartTime())
                        .endTime(request.getEndTime())
                        .remarks(request.getRemarks())
                        .build();

                Optional<StudentAttendance> existing = studentAttendanceRepository
                        .findByStudentIdAndTimetableIdAndAttendanceDate(studentId, timetableId, date);

                if (existing.isPresent()) {
                    StudentAttendance record = existing.get();
                    AttendanceStatus oldStatus = record.getStatus();
                    record.setStatus(request.getDefaultStatus());
                    record.setRemarks(request.getRemarks());
                    record.setStartTime(request.getStartTime());
                    record.setEndTime(request.getEndTime());
                    StudentAttendance saved = studentAttendanceRepository.save(record);
                    publishUpdated(saved, oldStatus);
                    results.add(studentAttendanceMapper.toResponse(saved));
                } else {
                    StudentAttendance saved = insertRecord(attendanceRequest);
                    publishRecorded(saved);
                    results.add(studentAttendanceMapper.toResponse(saved));
                }
            }
        }
        return results;
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
        return records.stream().map(studentAttendanceMapper::toResponse).toList();
    }

    /**
     * List attendance records for a timetable slot on a specific date.
     */
    @Transactional(readOnly = true)
    public List<StudentAttendanceResponse> getByTimetableAndDate(UUID timetableId, LocalDate date) {
        return studentAttendanceRepository.findByTimetableIdAndAttendanceDate(timetableId, date)
                .stream().map(studentAttendanceMapper::toResponse).toList();
    }

    /**
     * Compute attendance stats for a student, optionally scoped to one course.
     */
    @Transactional(readOnly = true)
    public StudentAttendanceStatsResponse getStats(UUID studentId, UUID courseId) {
        List<StudentAttendance> records = (courseId != null)
                ? studentAttendanceRepository.findByStudentIdAndCourseId(studentId, courseId)
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
        StudentAttendance attendance = studentAttendanceMapper.toEntity(request);
        StudentAttendance saved = studentAttendanceRepository.save(attendance);
        log.info("Created student attendance id={} for studentId={} timetableId={} date={}",
                saved.getId(), saved.getStudentId(), saved.getTimetableId(), saved.getAttendanceDate());
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
