package com.artacademy.courseenrollment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentRequest {

    @NotNull(message = "Student ID is required")
    private UUID studentId;

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotNull(message = "Teacher ID is required")
    private UUID teacherId;

    private LocalDate enrollmentDate;

    /**
     * Optional per-enrollment fee overrides (R8). When null/empty, the course's fees are
     * copied verbatim; when present, these amounts override what the student is billed.
     */
    @Valid
    private List<EnrollmentFeeDto> fees;

    /**
     * Optional per-child timetable slot assignment (R9). IDs of the course's TIMETABLES the
     * child is assigned to attend. Must belong to the enrollment's course.
     */
    private List<UUID> timetableIds;
}
