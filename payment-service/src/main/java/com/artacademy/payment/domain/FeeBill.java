package com.artacademy.payment.domain;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.ShareType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A materialised, payable bill for one enrollment fee line in one billing period
 * (§ FEE_BILLS). Created only by an explicit Generate-Bill action. Carries the frozen
 * revenue-share rule, the resolved institute/teacher amounts (stamped on flip to PAID), and
 * the principal override columns.
 */
@Entity
@Table(
    name = "FEE_BILLS",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_fee_bills_enrollment_type_period",
        columnNames = {"ENROLLMENT_ID", "FEE_TYPE", "BILLING_MONTH", "BILLING_YEAR"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeBill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ENROLLMENT_ID", nullable = false)
    private UUID enrollmentId;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "BILLING_MONTH", nullable = false)
    private Integer billingMonth;

    @Column(name = "BILLING_YEAR", nullable = false)
    private Integer billingYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "FEE_TYPE", nullable = false, length = 30)
    private FeeType feeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "CADENCE", nullable = false, length = 20)
    private FeeCadence cadence;

    @Column(name = "AMOUNT_DUE", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "PAID_AMOUNT", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "OUTSTANDING_AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal outstandingAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private FeeStatus status;

    @Column(name = "GENERATED_DATE")
    private LocalDateTime generatedDate;

    @Column(name = "DUE_DATE")
    private LocalDateTime dueDate;

    @Column(name = "PAYMENT_DATE")
    private LocalDateTime paymentDate;

    @Column(name = "OUTSTANDING_BILL", nullable = false)
    @Builder.Default
    private Boolean outstandingBill = Boolean.TRUE;

    @Column(name = "TEACHER_ID")
    private UUID teacherId;

    @Enumerated(EnumType.STRING)
    @Column(name = "INSTITUTE_SHARE_TYPE", length = 10)
    private ShareType instituteShareType;

    @Column(name = "INSTITUTE_SHARE_VALUE", precision = 12, scale = 2)
    private BigDecimal instituteShareValue;

    @Column(name = "INSTITUTE_SHARE_AMOUNT", precision = 12, scale = 2)
    private BigDecimal instituteShareAmount;

    @Column(name = "TEACHER_SHARE_AMOUNT", precision = 12, scale = 2)
    private BigDecimal teacherShareAmount;

    @Column(name = "OVERRIDE_INSTITUTE_SHARE", precision = 12, scale = 2)
    private BigDecimal overrideInstituteShare;

    @Column(name = "OVERRIDE_TEACHER_SHARE", precision = 12, scale = 2)
    private BigDecimal overrideTeacherShare;

    @Column(name = "OVERRIDDEN_BY")
    private UUID overriddenBy;

    @Column(name = "OVERRIDDEN_AT")
    private LocalDateTime overriddenAt;
}
