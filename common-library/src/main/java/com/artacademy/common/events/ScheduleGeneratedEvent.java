package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleGeneratedEvent {

    private UUID scheduleId;
    private UUID classId;
    private UUID teacherId;
    private UUID roomId;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private Instant occurredAt;
}
