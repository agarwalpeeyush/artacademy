package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CourseAttendanceSummaryResponse {

    private UUID courseId;
    private String courseName;
    private Integer attendanceMonth;
    private Integer attendanceYear;
    private long studentCount;
    private long totalDays;
    private long presentDays;
    private double attendancePercentage;
}
