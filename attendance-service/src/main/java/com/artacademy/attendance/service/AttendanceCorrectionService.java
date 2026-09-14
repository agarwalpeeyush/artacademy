package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.AttendanceCorrection;
import com.artacademy.attendance.domain.AttendanceRecordType;
import com.artacademy.attendance.domain.AttendanceStatus;
import com.artacademy.attendance.domain.StudentAttendance;
import com.artacademy.attendance.domain.TeacherAttendance;
import com.artacademy.attendance.dto.AttendanceCorrectionResponse;
import com.artacademy.attendance.dto.AttendanceEditRequest;
import com.artacademy.attendance.repository.AttendanceCorrectionRepository;
import com.artacademy.attendance.repository.StudentAttendanceRepository;
import com.artacademy.attendance.repository.TeacherAttendanceRepository;
import com.artacademy.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Direct attendance-edit service (R16). No request/approve/reject workflow: an authorized editor
 * (teacher for student attendance, principal for student or teacher attendance) applies the new
 * status immediately, and one audit-log row ({@link AttendanceCorrection}) is appended per changed
 * record capturing old->new, who, their role, and when. Records whose status is unchanged are
 * skipped (no event, no audit row).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AttendanceCorrectionService {

    private final AttendanceCorrectionRepository correctionRepository;
    private final StudentAttendanceRepository studentAttendanceRepository;
    private final TeacherAttendanceRepository teacherAttendanceRepository;
    private final StudentAttendanceService studentAttendanceService;
    private final TeacherAttendanceService teacherAttendanceService;

    /**
     * Apply a batch of direct edits to STUDENT attendance records.
     */
    public List<AttendanceCorrectionResponse> editStudentAttendance(AttendanceEditRequest request) {
        List<AttendanceCorrectionResponse> log = new ArrayList<>();
        for (AttendanceEditRequest.Edit edit : request.getEdits()) {
            StudentAttendance record = studentAttendanceRepository.findById(edit.getAttendanceId())
                    .orElseThrow(() -> ApiException.notFound(
                            "Student attendance record not found: " + edit.getAttendanceId()));
            AttendanceStatus oldStatus = record.getStatus();
            if (oldStatus == edit.getNewStatus()) {
                continue;
            }

            studentAttendanceService.applyCorrection(record.getId(), edit.getNewStatus());

            AttendanceCorrection audit = AttendanceCorrection.builder()
                    .attendanceType(AttendanceRecordType.STUDENT)
                    .attendanceId(record.getId())
                    .subjectId(record.getStudentId())
                    .classId(record.getTimetableId())
                    .attendanceDate(record.getAttendanceDate())
                    .oldStatus(oldStatus)
                    .newStatus(edit.getNewStatus())
                    .reason(request.getReason())
                    .editedByUserId(request.getEditedByUserId())
                    .editorRole(request.getEditorRole())
                    .build();
            log.add(toResponse(correctionRepository.save(audit)));
        }
        return log;
    }

    /**
     * Apply a batch of direct edits to TEACHER attendance records (principal only).
     */
    public List<AttendanceCorrectionResponse> editTeacherAttendance(AttendanceEditRequest request) {
        List<AttendanceCorrectionResponse> log = new ArrayList<>();
        for (AttendanceEditRequest.Edit edit : request.getEdits()) {
            TeacherAttendance record = teacherAttendanceRepository.findById(edit.getAttendanceId())
                    .orElseThrow(() -> ApiException.notFound(
                            "Teacher attendance record not found: " + edit.getAttendanceId()));
            AttendanceStatus oldStatus = record.getStatus();
            if (oldStatus == edit.getNewStatus()) {
                continue;
            }

            teacherAttendanceService.applyCorrection(record.getId(), edit.getNewStatus());

            AttendanceCorrection audit = AttendanceCorrection.builder()
                    .attendanceType(AttendanceRecordType.TEACHER)
                    .attendanceId(record.getId())
                    .subjectId(record.getTeacherId())
                    .classId(record.getTimetableId())
                    .attendanceDate(record.getAttendanceDate())
                    .oldStatus(oldStatus)
                    .newStatus(edit.getNewStatus())
                    .reason(request.getReason())
                    .editedByUserId(request.getEditedByUserId())
                    .editorRole(request.getEditorRole())
                    .build();
            log.add(toResponse(correctionRepository.save(audit)));
        }
        return log;
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> auditForAttendance(UUID attendanceId) {
        return correctionRepository.findByAttendanceId(attendanceId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> auditForSubject(UUID subjectId) {
        return correctionRepository.findBySubjectId(subjectId)
                .stream().map(this::toResponse).toList();
    }

    private AttendanceCorrectionResponse toResponse(AttendanceCorrection c) {
        return AttendanceCorrectionResponse.builder()
                .id(c.getId())
                .attendanceType(c.getAttendanceType())
                .attendanceId(c.getAttendanceId())
                .subjectId(c.getSubjectId())
                .classId(c.getClassId())
                .attendanceDate(c.getAttendanceDate())
                .oldStatus(c.getOldStatus())
                .newStatus(c.getNewStatus())
                .reason(c.getReason())
                .editedByUserId(c.getEditedByUserId())
                .editorRole(c.getEditorRole())
                .editedAt(c.getEditedAt())
                .build();
    }
}
