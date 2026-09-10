package com.artacademy.timetable.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomAvailabilityResponse {

    private UUID roomId;
    private String roomName;
    private DayOfWeek dayOfWeek;
    private List<Slot> occupied;
    private List<Slot> free;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Slot {
        private LocalTime startTime;
        private LocalTime endTime;
        private UUID timetableId;
        private UUID classId;
    }
}
