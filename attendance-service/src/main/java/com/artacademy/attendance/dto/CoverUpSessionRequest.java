package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Creates a cover-up (extra) class session and marks attendance for an ad-hoc roster in one call
 * (R18 / I2-I3). The roster is a teacher-chosen subset, not the full enrollment. No fee is charged.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoverUpSessionRequest {

    @NotNull(message = "Class ID is required")
    private UUID classId;

    private UUID courseId;

    @NotNull(message = "Session date is required")
    private LocalDate sessionDate;

    private LocalTime startTime;

    private LocalTime endTime;

    /** Optional link back to the missed REGULAR session this cover-up compensates for. */
    private UUID originalSessionId;

    @NotEmpty(message = "At least one student entry is required")
    @Valid
    private List<StudentEntry> students;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentEntry {
        @NotNull(message = "Student ID is required")
        private UUID studentId;

        @NotNull(message = "Attendance status is required")
        private AttendanceStatus status;

        private String remarks;
    }
}
