package com.artacademy.courseenrollment.attendance.dto;

import com.artacademy.courseenrollment.attendance.domain.AttendanceStatus;
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
 * Bulk-marks teacher attendance for one timetable slot across an explicit set of session dates
 * (R12). The frontend supplies the dates that fall on the slot's weekday (decision 8.3). One
 * TEACHER_ATTENDANCE row is written per (teacher, slot, date).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherRangeAttendanceRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotEmpty(message = "At least one session date is required")
    private List<LocalDate> sessionDates;

    @NotNull(message = "Default status is required")
    private AttendanceStatus defaultStatus;

    private String remarks;

    @NotEmpty(message = "At least one teacher ID is required")
    private List<UUID> teacherIds;
}
