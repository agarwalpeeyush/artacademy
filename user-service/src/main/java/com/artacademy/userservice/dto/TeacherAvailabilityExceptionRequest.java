package com.artacademy.userservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherAvailabilityExceptionRequest {

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String reason;

    private boolean unavailableAllDay;

    private LocalTime startTime;

    private LocalTime endTime;
}
