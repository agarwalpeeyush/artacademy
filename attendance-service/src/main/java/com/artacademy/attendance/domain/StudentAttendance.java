package com.artacademy.attendance.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "STUDENT_ATTENDANCE")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "CLASS_ID", nullable = false)
    private UUID classId;

    @Column(name = "COURSE_ID")
    private UUID courseId;

    @Column(name = "SESSION_ID")
    private UUID sessionId;

    @Column(name = "ATTENDANCE_DATE", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "REMARKS", columnDefinition = "TEXT")
    private String remarks;
}
