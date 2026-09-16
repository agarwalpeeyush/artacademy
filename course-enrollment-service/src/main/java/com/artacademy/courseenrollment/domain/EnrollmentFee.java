package com.artacademy.courseenrollment.domain;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.ShareType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A fee line owned by an {@link Enrollment} (R8). Copied from the course's {@link CourseFee}
 * at enroll time, then independently overridable — the enrollment is the source of truth for
 * what this student pays, so overrides bill correctly.
 */
@Entity
@Table(name = "ENROLLMENT_FEES",
        uniqueConstraints = @UniqueConstraint(name = "uq_enrollment_fee_type",
                columnNames = {"ENROLLMENT_ID", "FEE_TYPE"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentFee {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ENROLLMENT_ID", nullable = false)
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "FEE_TYPE", referencedColumnName = "CODE", nullable = false)
    private FeeType feeType;

    @Column(name = "AMOUNT", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "CADENCE", length = 20, nullable = false)
    private FeeCadence cadence;

    // When this fee falls due. Computed at enroll time from the cadence (ONE_TIME → enrollment date;
    // MONTHLY → the first billing date, i.e. the enrollment date) and independently overridable by
    // teacher/principal. Carried to payment-service to stamp the generated cycle's due date.
    @Column(name = "DUE_DATE")
    private LocalDate dueDate;

    // F3: per-child institute-share truth. Pre-filled from the course's CourseFee, then editable
    // per child. This is the rule frozen at enrollment and carried onward (F4/F11). Null = no cut.
    @Enumerated(EnumType.STRING)
    @Column(name = "INSTITUTE_SHARE_TYPE", length = 10)
    private ShareType instituteShareType;

    @Column(name = "INSTITUTE_SHARE_VALUE", precision = 12, scale = 2)
    private BigDecimal instituteShareValue;
}
