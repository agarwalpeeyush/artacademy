package com.artacademy.courseenrollment.attendance.dto;

import com.artacademy.courseenrollment.attendance.domain.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceResponse {

    private UUID id;
    private UUID studentId;
    private UUID courseId;
    private UUID timetableId;
    private LocalDate attendanceDate;
    private AttendanceStatus status;
    private LocalTime startTime;
    private LocalTime endTime;
    private String remarks;
}
