package com.artacademy.courseenrollment.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A materialised FEE_BILLS row plus read-derived fields (overdue, displayStatus, excess/short). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeBillResponse {

    private UUID id;
    private UUID enrollmentId;
    private UUID studentId;
    private Integer billingMonth;
    private Integer billingYear;
    private String feeType;
    private String cadence;
    private BigDecimal amountDue;
    private BigDecimal paidAmount;
    private BigDecimal outstandingAmount;
    private String status;
    private LocalDateTime generatedDate;
    private LocalDateTime dueDate;
    private LocalDateTime paymentDate;
    private Boolean outstandingBill;
    private UUID teacherId;

    private BigDecimal instituteShareAmount;
    private BigDecimal teacherShareAmount;
    private Boolean overridden;

    // Read-derived
    private Boolean overdue;
    private String displayStatus;
    private BigDecimal excessAmount;
    private BigDecimal shortAmount;
}
