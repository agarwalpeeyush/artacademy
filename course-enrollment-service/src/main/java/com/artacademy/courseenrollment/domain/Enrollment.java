package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "ENROLLMENTS",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_enrollment_student_course",
        columnNames = {"STUDENT_ID", "COURSE_ID"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "CLASS_ID", nullable = false)
    private UUID classId;

    @Column(name = "ENROLLMENT_DATE", nullable = false)
    private LocalDate enrollmentDate;

    @Column(name = "STATUS", length = 20, nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "COURSE_ID", insertable = false, updatable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CLASS_ID", insertable = false, updatable = false)
    private CourseClass courseClass;
}
