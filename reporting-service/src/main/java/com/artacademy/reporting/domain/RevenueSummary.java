package com.artacademy.reporting.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
    name = "REVENUE_SUMMARY",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_revenue_summary",
        columnNames = {"BILLING_MONTH", "BILLING_YEAR"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenueSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "BILLING_MONTH", nullable = false)
    private Integer billingMonth;

    @Column(name = "BILLING_YEAR", nullable = false)
    private Integer billingYear;

    @Column(name = "TOTAL_BILLED", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalBilled = BigDecimal.ZERO;

    @Column(name = "TOTAL_COLLECTED", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalCollected = BigDecimal.ZERO;

    @Column(name = "OUTSTANDING", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal outstanding = BigDecimal.ZERO;

    @Column(name = "STUDENT_COUNT", nullable = false)
    @Builder.Default
    private Integer studentCount = 0;
}
