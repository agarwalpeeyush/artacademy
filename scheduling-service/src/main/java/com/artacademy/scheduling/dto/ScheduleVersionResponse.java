package com.artacademy.scheduling.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleVersionResponse {

    private UUID id;
    private Integer versionNumber;
    private Instant publishedAt;
    private String publishedBy;
    private Integer entryCount;
    private List<Entry> entries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private UUID scheduleId;
        private UUID classId;
        private UUID teacherId;
        private UUID roomId;
        private String roomName;
        private DayOfWeek dayOfWeek;
        private LocalTime startTime;
        private LocalTime endTime;
    }
}
