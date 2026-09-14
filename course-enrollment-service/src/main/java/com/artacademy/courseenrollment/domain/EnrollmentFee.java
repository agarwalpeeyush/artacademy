package com.artacademy.courseenrollment.domain;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
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

    @Enumerated(EnumType.STRING)
    @Column(name = "FEE_TYPE", length = 50, nullable = false)
    private FeeType feeType;

    @Column(name = "AMOUNT", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "CADENCE", length = 20, nullable = false)
    private FeeCadence cadence;
}
