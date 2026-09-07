package com.artacademy.courseenrollment.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequest {

    @NotBlank(message = "Course code is required")
    @Size(max = 50, message = "Course code must not exceed 50 characters")
    private String courseCode;

    @NotBlank(message = "Course name is required")
    private String courseName;

    @Size(max = 50, message = "Course type must not exceed 50 characters")
    private String courseType;

    private String description;

    @DecimalMin(value = "0.0", message = "Monthly fee must be non-negative")
    private BigDecimal monthlyFee;

    @DecimalMin(value = "0.0", message = "Admission fee must be non-negative")
    private BigDecimal admissionFee;

    @Positive(message = "Duration in months must be positive")
    private Integer durationMonths;

    @NotBlank(message = "Status is required")
    private String status;
}
