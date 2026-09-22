package com.artacademy.courseenrollment.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/** Enrollment header mirrored from course-enrollment (§ STUDENT_FEE). PK is the enrollmentId. */
@Entity
@Table(name = "STUDENT_FEE")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFee {

    @Id
    @Column(name = "ENROLLMENT_ID", nullable = false)
    private UUID enrollmentId;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "TEACHER_ID")
    private UUID teacherId;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private EnrollmentStatus status;
}
