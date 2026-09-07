package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "COURSES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "COURSE_CODE", length = 50, unique = true, nullable = false)
    private String courseCode;

    @Column(name = "COURSE_NAME", nullable = false)
    private String courseName;

    @Column(name = "COURSE_TYPE", length = 50)
    private String courseType;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @Column(name = "MONTHLY_FEE", precision = 12, scale = 2)
    private BigDecimal monthlyFee;

    @Column(name = "ADMISSION_FEE", precision = 12, scale = 2)
    private BigDecimal admissionFee;

    @Column(name = "DURATION_MONTHS")
    private Integer durationMonths;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
