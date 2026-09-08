package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceStatus;
import com.artacademy.attendance.domain.CorrectionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCorrectionResponse {

    private UUID id;
    private UUID studentAttendanceId;
    private UUID studentId;
    private UUID classId;
    private LocalDate attendanceDate;
    private AttendanceStatus requestedStatus;
    private String reason;
    private UUID requestedByTeacherId;
    private CorrectionStatus status;
    private UUID reviewedByPrincipalId;
    private String reviewNote;
    private Instant createdAt;
    private Instant reviewedAt;
}
