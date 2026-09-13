package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Bulk-marks teacher attendance for one class across a date range (R11 / G4). A separate
 * TEACHER_ATTENDANCE row is written per (teacher, class, date), so a teacher taking two classes
 * on the same day accumulates two rows.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherRangeAttendanceRequest {

    private UUID courseId;

    @NotNull(message = "From date is required")
    private LocalDate fromDate;

    @NotNull(message = "To date is required")
    private LocalDate toDate;

    @NotNull(message = "Default status is required")
    private AttendanceStatus defaultStatus;

    private String remarks;

    @NotEmpty(message = "At least one teacher ID is required")
    private List<UUID> teacherIds;
}
