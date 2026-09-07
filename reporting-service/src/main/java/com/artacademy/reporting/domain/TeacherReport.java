package com.artacademy.reporting.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "TEACHER_REPORT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "TEACHER_ID", nullable = false, unique = true)
    private UUID teacherId;

    @Column(name = "EMPLOYEE_CODE", length = 50)
    private String employeeCode;

    @Column(name = "FIRST_NAME", nullable = false, length = 200)
    private String firstName;

    @Column(name = "LAST_NAME", length = 200)
    private String lastName;

    @Column(name = "TOTAL_CLASSES", nullable = false)
    @Builder.Default
    private Integer totalClasses = 0;

    @Column(name = "ATTENDANCE_PERCENTAGE", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal attendancePercentage = BigDecimal.ZERO;
}
