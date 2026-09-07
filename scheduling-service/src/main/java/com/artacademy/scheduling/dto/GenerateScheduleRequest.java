package com.artacademy.scheduling.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateScheduleRequest {

    @NotEmpty(message = "Schedule items list must not be empty")
    @Valid
    private List<ScheduleItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleItem {

        @NotNull(message = "Class ID is required")
        private UUID classId;

        @NotNull(message = "Teacher ID is required")
        private UUID teacherId;

        @NotNull(message = "Preferred day of week is required")
        private DayOfWeek preferredDayOfWeek;

        @NotNull(message = "Duration in minutes is required")
        private Integer durationMinutes;
    }
}
