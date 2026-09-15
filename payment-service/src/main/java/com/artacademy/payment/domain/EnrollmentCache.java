package com.artacademy.payment.domain;

import com.artacademy.common.fee.ShareType;
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

    /** Teacher attributed for this enrollment (F5), stamped onto every generated fee detail. */
    @Column(name = "TEACHER_ID")
    private UUID teacherId;

    // Frozen share rule for the recurring/monthly line, carried onto monthly-generated details (F3).
    @Enumerated(EnumType.STRING)
    @Column(name = "INSTITUTE_SHARE_TYPE", length = 10)
    private ShareType instituteShareType;

    @Column(name = "INSTITUTE_SHARE_VALUE", precision = 12, scale = 2)
    private BigDecimal instituteShareValue;
}
