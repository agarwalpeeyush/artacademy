package com.artacademy.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeDetailResponse {

    private UUID id;
    private UUID feeCycleId;
    private UUID studentId;
    private UUID enrollmentId;
    private UUID courseId;
    private BigDecimal courseFee;
    private BigDecimal allocatedPaidAmount;
    private BigDecimal outstandingAmount;
    private String status;

    private UUID teacherId;
    // Effective institute/teacher shares (F8): override if present, else resolved/persisted amount,
    // else a live computation from the frozen rule. Non-null once populated by the read decorator.
    private BigDecimal instituteShareAmount;
    private BigDecimal teacherShareAmount;
    private boolean overridden;
}
