package com.artacademy.courseenrollment.payment.dto;

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
    private UUID studentId;
    private BigDecimal amount;
    private String paymentMode;
    private String transactionReference;
    private LocalDateTime paymentDate;
    private String remarks;

    /** Bills this payment settled (fully or partially), oldest first in waterfall order. */
    private List<UUID> settledBillIds;

    /** Amount that landed in the student's credit balance after all bills were settled. */
    private BigDecimal creditBalance;
}
