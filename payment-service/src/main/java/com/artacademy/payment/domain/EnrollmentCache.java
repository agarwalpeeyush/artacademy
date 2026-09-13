package com.artacademy.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "ENROLLMENT_CACHE")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentCache {

    @Id
    @Column(name = "ENROLLMENT_ID")
    private UUID enrollmentId;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    /** Sum of the course's RECURRING (monthly) fees. Drives the monthly batch generator. */
    @Column(name = "COURSE_FEE", nullable = false, precision = 12, scale = 2)
    private BigDecimal courseFee;

    @Column(name = "STATUS", nullable = false, length = 20)
    private String status;
}
