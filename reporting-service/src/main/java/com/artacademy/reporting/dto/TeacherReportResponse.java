package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class TeacherReportResponse {

    private UUID id;
    private UUID teacherId;
    private String employeeCode;
    private String firstName;
    private String lastName;
    private Integer totalClasses;
    private BigDecimal attendancePercentage;
}
