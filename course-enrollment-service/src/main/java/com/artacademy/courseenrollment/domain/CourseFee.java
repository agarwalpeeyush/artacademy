package com.artacademy.courseenrollment.domain;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A single fee carried by a course (R5). A course carries a set of these — each with its own
 * {@link FeeType} and {@link FeeCadence} (RECURRING billed monthly, ONE_TIME billed once).
 */
@Entity
@Table(name = "COURSE_FEES",
        uniqueConstraints = @UniqueConstraint(name = "uq_course_fee_type",
                columnNames = {"COURSE_ID", "FEE_TYPE"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseFee {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "COURSE_ID", nullable = false)
    private Course course;

    @Enumerated(EnumType.STRING)
    @Column(name = "FEE_TYPE", length = 50, nullable = false)
    private FeeType feeType;

    @Column(name = "AMOUNT", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "CADENCE", length = 20, nullable = false)
    private FeeCadence cadence;
}
