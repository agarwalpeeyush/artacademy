package com.artacademy.courseenrollment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {

    private UUID id;
    private String courseCode;
    private String courseName;
    private String courseType;
    private String description;
    private BigDecimal monthlyFee;
    private BigDecimal admissionFee;
    private Integer durationMonths;
    private String status;
}
