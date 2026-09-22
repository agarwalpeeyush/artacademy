package com.artacademy.courseenrollment.attendance.dto;

import com.artacademy.courseenrollment.attendance.domain.AttendanceStatus;
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
 * Bulk-mark a timetable slot's roster across an explicit set of dates (R10). The frontend
 * orchestrates which dates fall on the slot's weekday (decision 8.3) and passes them in
 * {@code sessionDates}; every (student, date) pair is upserted with {@code defaultStatus}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableRangeAttendanceRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotEmpty(message = "At least one session date is required")
    private List<LocalDate> sessionDates;

    @NotNull(message = "Default status is required")
    private AttendanceStatus defaultStatus;

    private LocalTime startTime;

    private LocalTime endTime;

    private String remarks;

    @NotEmpty(message = "At least one student ID is required")
    private List<UUID> studentIds;
}
