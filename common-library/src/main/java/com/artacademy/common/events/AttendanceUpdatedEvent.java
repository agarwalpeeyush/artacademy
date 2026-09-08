package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceUpdatedEvent {
    private String attendanceType; // STUDENT or TEACHER
    private UUID subjectId;        // studentId or teacherId
    private String oldStatus;
    private String newStatus;
    private String attendanceDate;
    private UUID courseId;
    private String courseName;
    private Instant occurredAt;
}
