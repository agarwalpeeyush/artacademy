package com.artacademy.scheduling.dto;

import com.artacademy.scheduling.domain.ScheduleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleResponse {

    private UUID id;
    private UUID classId;
    private UUID teacherId;
    private UUID roomId;
    private String roomName;
    private LocalTime startTime;
    private LocalTime endTime;
    private DayOfWeek dayOfWeek;
    private ScheduleStatus status;
    private Instant publishedAt;
}
