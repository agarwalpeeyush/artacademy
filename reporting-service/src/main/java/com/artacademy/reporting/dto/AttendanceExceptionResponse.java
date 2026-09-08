package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AttendanceExceptionResponse {

    private UUID subjectId;
    private String subjectName;
    private String subjectType;
    private Integer attendanceMonth;
    private Integer attendanceYear;
    private Integer totalDays;
    private Integer presentDays;
    private double attendancePercentage;
}
