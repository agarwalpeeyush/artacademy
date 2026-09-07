package com.artacademy.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
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
}
