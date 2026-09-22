package com.artacademy.courseenrollment.attendance.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "TEACHER_ATTENDANCE",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_teacher_attendance",
        columnNames = {"TEACHER_ID", "TIMETABLE_ID", "ATTENDANCE_DATE"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "TEACHER_ID", nullable = false)
    private UUID teacherId;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "TIMETABLE_ID", nullable = false)
    private UUID timetableId;

    @Column(name = "ATTENDANCE_DATE", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "REMARKS", columnDefinition = "TEXT")
    private String remarks;
}
