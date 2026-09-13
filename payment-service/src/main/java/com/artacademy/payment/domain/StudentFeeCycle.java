package com.artacademy.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
    name = "STUDENT_FEE_CYCLES",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_student_fee_cycles_student_month_year",
        columnNames = {"STUDENT_ID", "BILLING_MONTH", "BILLING_YEAR", "CYCLE_KIND", "SOURCE_REF"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFeeCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "BILLING_MONTH", nullable = false)
    private Integer billingMonth;

    @Column(name = "BILLING_YEAR", nullable = false)
    private Integer billingYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "CYCLE_KIND", nullable = false, length = 20)
    @Builder.Default
    private FeeCycleKind cycleKind = FeeCycleKind.MONTHLY;

    /**
     * Distinguishes multiple one-time cycles of the same kind for a student in one billing month
     * (e.g. two EXAM cycles from different exams). Holds the triggering entity id (examId) for
     * triggered fees; NULL for MONTHLY/ADMISSION.
     */
    @Column(name = "SOURCE_REF")
    private UUID sourceRef;

    @Column(name = "TOTAL_AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

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

    @OneToMany(mappedBy = "feeCycle", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StudentFeeDetail> details = new ArrayList<>();
}
