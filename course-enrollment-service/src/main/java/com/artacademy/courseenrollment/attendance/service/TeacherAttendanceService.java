package com.artacademy.courseenrollment.attendance.service;

import com.artacademy.courseenrollment.attendance.domain.AttendanceStatus;
import com.artacademy.courseenrollment.attendance.domain.TeacherAttendance;
import com.artacademy.courseenrollment.attendance.dto.TeacherAttendanceRequest;
import com.artacademy.courseenrollment.attendance.dto.TeacherAttendanceResponse;
import com.artacademy.courseenrollment.attendance.dto.TeacherRangeAttendanceRequest;
import com.artacademy.courseenrollment.attendance.mapper.TeacherAttendanceMapper;
import com.artacademy.courseenrollment.attendance.repository.TeacherAttendanceRepository;
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
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Upsert attendance: update if a record already exists for the teacher+timetable+date,
     * otherwise create a new one. A teacher teaching two slots on the same day therefore
     * gets two rows (R12).
     */
    public TeacherAttendanceResponse markAttendance(TeacherAttendanceRequest request) {
        Optional<TeacherAttendance> existing =
                teacherAttendanceRepository.findByTeacherIdAndTimetableIdAndAttendanceDate(
                        request.getTeacherId(), request.getTimetableId(), request.getAttendanceDate());

        TeacherAttendance attendance;
        if (existing.isPresent()) {
            attendance = existing.get();
            teacherAttendanceMapper.updateEntityFromRequest(request, attendance);
            log.info("Updating teacher attendance id={} for teacherId={} timetableId={} date={}",
                    attendance.getId(), request.getTeacherId(), request.getTimetableId(),
                    request.getAttendanceDate());
        } else {
            attendance = teacherAttendanceMapper.toEntity(request);
            log.info("Creating teacher attendance for teacherId={} timetableId={} date={}",
                    request.getTeacherId(), request.getTimetableId(), request.getAttendanceDate());
        }

        TeacherAttendance saved = teacherAttendanceRepository.save(attendance);
        publishRecorded(saved);
        return teacherAttendanceMapper.toResponse(saved);
    }

    /**
     * Bulk-mark teacher attendance for one timetable slot across an explicit set of session dates
     * (R12). The frontend supplies the dates that fall on the slot's weekday (decision 8.3).
     * Existing rows are updated; missing ones inserted. Idempotent.
     */
    public List<TeacherAttendanceResponse> markTimetableAttendanceForRange(UUID timetableId,
                                                                           TeacherRangeAttendanceRequest request) {
        List<TeacherAttendanceResponse> results = new ArrayList<>();
        for (LocalDate date : request.getSessionDates()) {
            for (UUID teacherId : request.getTeacherIds()) {
                TeacherAttendance record = teacherAttendanceRepository
                        .findByTeacherIdAndTimetableIdAndAttendanceDate(teacherId, timetableId, date)
                        .orElseGet(() -> TeacherAttendance.builder()
                                .teacherId(teacherId)
                                .timetableId(timetableId)
                                .attendanceDate(date)
                                .build());
                record.setCourseId(request.getCourseId());
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
     * List teacher attendance rows for a timetable slot on a specific date.
     */
    @Transactional(readOnly = true)
    public List<TeacherAttendanceResponse> getByTimetableAndDate(UUID timetableId, LocalDate date) {
        return teacherAttendanceRepository.findByTimetableIdAndAttendanceDate(timetableId, date)
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
        log.info("Published AttendanceRecordedEvent for teacherId={} timetableId={}",
                saved.getTeacherId(), saved.getTimetableId());
    }
}
