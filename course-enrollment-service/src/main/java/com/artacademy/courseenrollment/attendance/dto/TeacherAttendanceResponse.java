package com.artacademy.courseenrollment.attendance.dto;

import com.artacademy.courseenrollment.attendance.domain.AttendanceStatus;
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
    private UUID courseId;
    private UUID timetableId;
    private LocalDate attendanceDate;
    private AttendanceStatus status;
    private String remarks;
}
