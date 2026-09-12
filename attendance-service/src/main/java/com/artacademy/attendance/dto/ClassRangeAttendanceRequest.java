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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRangeAttendanceRequest {

    private UUID courseId;

    @NotNull(message = "From date is required")
    private LocalDate fromDate;

    @NotNull(message = "To date is required")
    private LocalDate toDate;

    @NotNull(message = "Default status is required")
    private AttendanceStatus defaultStatus;

    private String remarks;

    @NotEmpty(message = "At least one student ID is required")
    private List<UUID> studentIds;
}
