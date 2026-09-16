package com.artacademy.payment.domain;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.ShareType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Editable fee catalogue line for an enrollment (§ STUDENT_FEE_DETAIL). One row per
 * (enrollment, feeType); this is what the teacher/principal edits before a bill is generated.
 */
@Entity
@Table(
    name = "STUDENT_FEE_DETAIL",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_student_fee_detail_enrollment_type",
        columnNames = {"ENROLLMENT_ID", "FEE_TYPE"}
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

    @Column(name = "ENROLLMENT_ID", nullable = false)
    private UUID enrollmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "FEE_TYPE", nullable = false, length = 30)
    private FeeType feeType;

    @Column(name = "AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "CADENCE", nullable = false, length = 20)
    private FeeCadence cadence;

    @Column(name = "DUE_DATE")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "INSTITUTE_SHARE_TYPE", length = 10)
    private ShareType instituteShareType;

    @Column(name = "INSTITUTE_SHARE_VALUE", precision = 12, scale = 2)
    private BigDecimal instituteShareValue;
}
