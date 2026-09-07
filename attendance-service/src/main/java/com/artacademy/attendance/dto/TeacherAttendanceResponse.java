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
public class TeacherAttendanceResponse {

    private UUID id;
    private UUID teacherId;
    private LocalDate attendanceDate;
    private AttendanceStatus status;
    private String remarks;
}
