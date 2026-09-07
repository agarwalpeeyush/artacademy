package com.artacademy.reporting.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
    name = "ATTENDANCE_SUMMARY",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_attendance_summary",
        columnNames = {"SUBJECT_TYPE", "SUBJECT_ID", "ATTENDANCE_MONTH", "ATTENDANCE_YEAR"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "SUBJECT_TYPE", nullable = false, length = 20)
    private String subjectType;       // STUDENT | TEACHER

    @Column(name = "SUBJECT_ID", nullable = false)
    private UUID subjectId;

    @Column(name = "SUBJECT_NAME", nullable = false, length = 200)
    private String subjectName;

    @Column(name = "ATTENDANCE_MONTH", nullable = false)
    private Integer attendanceMonth;

    @Column(name = "ATTENDANCE_YEAR", nullable = false)
    private Integer attendanceYear;

    @Column(name = "TOTAL_DAYS", nullable = false)
    @Builder.Default
    private Integer totalDays = 0;

    @Column(name = "PRESENT_DAYS", nullable = false)
    @Builder.Default
    private Integer presentDays = 0;

    @Column(name = "ABSENT_DAYS", nullable = false)
    @Builder.Default
    private Integer absentDays = 0;

    @Column(name = "LEAVE_DAYS", nullable = false)
    @Builder.Default
    private Integer leaveDays = 0;
}
