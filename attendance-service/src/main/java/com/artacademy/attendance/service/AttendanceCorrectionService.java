package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.AttendanceCorrection;
import com.artacademy.attendance.domain.CorrectionStatus;
import com.artacademy.attendance.domain.StudentAttendance;
import com.artacademy.attendance.dto.AttendanceCorrectionRequest;
import com.artacademy.attendance.dto.AttendanceCorrectionResponse;
import com.artacademy.attendance.dto.AttendanceCorrectionReviewRequest;
import com.artacademy.attendance.repository.AttendanceCorrectionRepository;
import com.artacademy.attendance.repository.StudentAttendanceRepository;
import com.artacademy.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AttendanceCorrectionService {

    private final AttendanceCorrectionRepository correctionRepository;
    private final StudentAttendanceRepository studentAttendanceRepository;
    private final StudentAttendanceService studentAttendanceService;

    /**
     * Submit a correction request against an existing attendance record.
     */
    public AttendanceCorrectionResponse submit(AttendanceCorrectionRequest request) {
        StudentAttendance target = studentAttendanceRepository
                .findById(request.getStudentAttendanceId())
                .orElseThrow(() -> ApiException.notFound(
                        "Attendance record not found: " + request.getStudentAttendanceId()));

        AttendanceCorrection correction = AttendanceCorrection.builder()
                .studentAttendanceId(target.getId())
                .studentId(target.getStudentId())
                .classId(target.getClassId())
                .attendanceDate(target.getAttendanceDate())
                .requestedStatus(request.getRequestedStatus())
                .reason(request.getReason())
                .requestedByTeacherId(request.getRequestedByTeacherId())
                .status(CorrectionStatus.PENDING)
                .build();

        AttendanceCorrection saved = correctionRepository.save(correction);
        log.info("Correction request id={} submitted for attendanceId={} by teacherId={}",
                saved.getId(), target.getId(), request.getRequestedByTeacherId());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> listByStatus(CorrectionStatus status) {
        List<AttendanceCorrection> corrections = (status != null)
                ? correctionRepository.findByStatus(status)
                : correctionRepository.findAll();
        return corrections.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> listByTeacher(UUID teacherId) {
        return correctionRepository.findByRequestedByTeacherId(teacherId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Approve a correction: mutate the target record's status and fire
     * ATTENDANCE_UPDATED, then mark the correction APPROVED.
     */
    public AttendanceCorrectionResponse approve(UUID id, AttendanceCorrectionReviewRequest review) {
        AttendanceCorrection correction = load(id);
        requirePending(correction);

        studentAttendanceService.applyCorrection(
                correction.getStudentAttendanceId(), correction.getRequestedStatus());

        correction.setStatus(CorrectionStatus.APPROVED);
        correction.setReviewedByPrincipalId(review.getReviewedByPrincipalId());
        correction.setReviewNote(review.getReviewNote());
        correction.setReviewedAt(Instant.now());
        AttendanceCorrection saved = correctionRepository.save(correction);
        log.info("Correction id={} APPROVED by principalId={}", id, review.getReviewedByPrincipalId());
        return toResponse(saved);
    }

    /**
     * Reject a correction: no mutation of the underlying record.
     */
    public AttendanceCorrectionResponse reject(UUID id, AttendanceCorrectionReviewRequest review) {
        AttendanceCorrection correction = load(id);
        requirePending(correction);

        correction.setStatus(CorrectionStatus.REJECTED);
        correction.setReviewedByPrincipalId(review.getReviewedByPrincipalId());
        correction.setReviewNote(review.getReviewNote());
        correction.setReviewedAt(Instant.now());
        AttendanceCorrection saved = correctionRepository.save(correction);
        log.info("Correction id={} REJECTED by principalId={}", id, review.getReviewedByPrincipalId());
        return toResponse(saved);
    }

    // -------------------------------------------------------------------------

    private AttendanceCorrection load(UUID id) {
        return correctionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Correction request not found: " + id));
    }

    private void requirePending(AttendanceCorrection correction) {
        if (correction.getStatus() != CorrectionStatus.PENDING) {
            throw ApiException.conflict(
                    "Correction request already " + correction.getStatus());
        }
    }

    private AttendanceCorrectionResponse toResponse(AttendanceCorrection c) {
        return AttendanceCorrectionResponse.builder()
                .id(c.getId())
                .studentAttendanceId(c.getStudentAttendanceId())
                .studentId(c.getStudentId())
                .classId(c.getClassId())
                .attendanceDate(c.getAttendanceDate())
                .requestedStatus(c.getRequestedStatus())
                .reason(c.getReason())
                .requestedByTeacherId(c.getRequestedByTeacherId())
                .status(c.getStatus())
                .reviewedByPrincipalId(c.getReviewedByPrincipalId())
                .reviewNote(c.getReviewNote())
                .createdAt(c.getCreatedAt())
                .reviewedAt(c.getReviewedAt())
                .build();
    }
}
