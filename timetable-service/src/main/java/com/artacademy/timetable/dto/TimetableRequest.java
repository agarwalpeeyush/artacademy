package com.artacademy.timetable.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableRequest {

    @NotNull(message = "Class ID is required")
    private UUID classId;

    @NotNull(message = "Teacher ID is required")
    private UUID teacherId;

    @NotNull(message = "Room ID is required")
    private UUID roomId;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @NotNull(message = "Day of week is required")
    private DayOfWeek dayOfWeek;
}
