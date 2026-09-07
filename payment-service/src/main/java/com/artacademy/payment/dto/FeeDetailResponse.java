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
}
