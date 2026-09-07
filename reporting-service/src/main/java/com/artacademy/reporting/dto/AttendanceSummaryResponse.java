package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AttendanceSummaryResponse {

    private UUID id;
    private String subjectType;
    private UUID subjectId;
    private String subjectName;
    private Integer attendanceMonth;
    private Integer attendanceYear;
    private Integer totalDays;
    private Integer presentDays;
    private Integer absentDays;
    private Integer leaveDays;
}
