package com.artacademy.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeCycleResponse {

    private UUID id;
    private UUID studentId;
    private Integer billingMonth;
    private Integer billingYear;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal outstandingAmount;
    private String status;
    private LocalDateTime generatedDate;
    private LocalDateTime dueDate;
    private List<FeeDetailResponse> details;
}
