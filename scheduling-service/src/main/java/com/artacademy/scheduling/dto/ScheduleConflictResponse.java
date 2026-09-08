package com.artacademy.scheduling.dto;

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
public class ScheduleConflictResponse {

    public enum ConflictType {
        TEACHER_DOUBLE_BOOKED,
        ROOM_DOUBLE_BOOKED,
        CLASS_OVERLAP
    }

    private ConflictType type;
    private DayOfWeek dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private UUID scheduleId;
    private UUID otherScheduleId;
    private UUID teacherId;
    private UUID roomId;
    private UUID classId;
    private String description;
}
