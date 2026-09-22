package com.artacademy.courseenrollment.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceStatsResponse {

    private UUID studentId;
    private long totalDays;
    private long presentDays;
    private long absentDays;
    private long leaveDays;
    private long halfDays;
    private double attendancePercentage;
}
