package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceRecordType;
import com.artacademy.attendance.domain.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A single attendance-edit audit-log entry (R16).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCorrectionResponse {

    private UUID id;
    private AttendanceRecordType attendanceType;
    private UUID attendanceId;
    private UUID subjectId;
    private UUID timetableId;
    private LocalDate attendanceDate;
    private AttendanceStatus oldStatus;
    private AttendanceStatus newStatus;
    private String reason;
    private UUID editedByUserId;
    private String editorRole;
    private Instant editedAt;
}
