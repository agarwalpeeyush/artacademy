package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCorrectionRequest {

    @NotNull(message = "Target attendance record id is required")
    private UUID studentAttendanceId;

    @NotNull(message = "Requested status is required")
    private AttendanceStatus requestedStatus;

    private String reason;

    @NotNull(message = "Requesting teacher id is required")
    private UUID requestedByTeacherId;
}
