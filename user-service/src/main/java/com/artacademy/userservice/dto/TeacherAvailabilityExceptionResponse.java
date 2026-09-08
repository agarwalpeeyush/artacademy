package com.artacademy.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherAvailabilityExceptionResponse {

    private UUID id;
    private UUID teacherId;
    private LocalDate date;
    private String reason;
    private boolean unavailableAllDay;
    private LocalTime startTime;
    private LocalTime endTime;
}
