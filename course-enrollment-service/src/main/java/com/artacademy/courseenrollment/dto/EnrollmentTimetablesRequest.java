package com.artacademy.courseenrollment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Sets the full timetable-slot assignment for an enrollment (R9). The list replaces any
 * existing assignment; an empty list clears it. Each id must be a slot of the enrollment's course.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentTimetablesRequest {

    @NotNull(message = "Timetable IDs are required (use an empty list to clear)")
    private List<UUID> timetableIds;
}
