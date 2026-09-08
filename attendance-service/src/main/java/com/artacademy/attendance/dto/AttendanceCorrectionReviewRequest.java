package com.artacademy.attendance.dto;

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
public class AttendanceCorrectionReviewRequest {

    @NotNull(message = "Reviewing principal id is required")
    private UUID reviewedByPrincipalId;

    private String reviewNote;
}
