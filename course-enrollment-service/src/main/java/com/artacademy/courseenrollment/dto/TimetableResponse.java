package com.artacademy.courseenrollment.dto;

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
public class TimetableResponse {

    private UUID id;
    private UUID classId;
    private UUID teacherId;
    private LocalTime startTime;
    private LocalTime endTime;
    private DayOfWeek dayOfWeek;
}
