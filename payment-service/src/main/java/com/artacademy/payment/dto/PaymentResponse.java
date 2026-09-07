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
public class PaymentResponse {

    private UUID id;
    private UUID feeCycleId;
    private UUID studentId;
    private BigDecimal amount;
    private String paymentMode;
    private String transactionReference;
    private LocalDateTime paymentDate;
    private String remarks;
    private List<PaymentAllocationResponse> allocations;
}
