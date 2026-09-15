package com.artacademy.payment.domain;

import com.artacademy.common.fee.ShareType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "STUDENT_FEE_DETAILS",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_student_fee_details_cycle_enrollment",
        columnNames = {"FEE_CYCLE_ID", "ENROLLMENT_ID"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFeeDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FEE_CYCLE_ID", nullable = false)
    private StudentFeeCycle feeCycle;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "ENROLLMENT_ID", nullable = false)
    private UUID enrollmentId;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "COURSE_FEE", nullable = false, precision = 12, scale = 2)
    private BigDecimal courseFee;

    @Column(name = "ALLOCATED_PAID_AMOUNT", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal allocatedPaidAmount = BigDecimal.ZERO;

    @Column(name = "OUTSTANDING_AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal outstandingAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private FeeStatus status;

    @Column(name = "TEACHER_ID")
    private UUID teacherId;

    // Frozen share rule copied from the enrollment (F3/F4). Used to resolve the shares on the
    // fly before PAID, and persisted into the amounts below when the detail becomes fully PAID.
    @Enumerated(EnumType.STRING)
    @Column(name = "INSTITUTE_SHARE_TYPE", length = 10)
    private ShareType instituteShareType;

    @Column(name = "INSTITUTE_SHARE_VALUE", precision = 12, scale = 2)
    private BigDecimal instituteShareValue;

    // Resolved amounts (F7): null until the detail becomes fully PAID, then persisted from the rule.
    @Column(name = "INSTITUTE_SHARE_AMOUNT", precision = 12, scale = 2)
    private BigDecimal instituteShareAmount;

    @Column(name = "TEACHER_SHARE_AMOUNT", precision = 12, scale = 2)
    private BigDecimal teacherShareAmount;

    // Principal override (F8/F12): auditable, wins over the resolved amounts when present.
    @Column(name = "OVERRIDE_INSTITUTE_SHARE", precision = 12, scale = 2)
    private BigDecimal overrideInstituteShare;

    @Column(name = "OVERRIDE_TEACHER_SHARE", precision = 12, scale = 2)
    private BigDecimal overrideTeacherShare;

    @Column(name = "OVERRIDDEN_BY")
    private UUID overriddenBy;

    @Column(name = "OVERRIDDEN_AT")
    private LocalDateTime overriddenAt;
}
