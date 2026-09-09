package com.artacademy.courseenrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    private UUID teacherId;

    @NotBlank(message = "Course Class name is required")
    private String className;

    private String roomNumber;

    private UUID roomId;

    private String roomName;

    @Positive(message = "Capacity must be greater than zero")
    private Integer capacity;

    private LocalDate startDate;

    private LocalDate endDate;

    @NotBlank(message = "Status is required")
    private String status;
}
