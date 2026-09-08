package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceStatus;
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
public class StudentAttendanceResponse {

    private UUID id;
    private UUID studentId;
    private UUID classId;
    private UUID courseId;
    private UUID sessionId;
    private LocalDate attendanceDate;
    private AttendanceStatus status;
    private String remarks;
}
