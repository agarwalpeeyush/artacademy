package com.artacademy.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @NotNull(message = "Fee cycle ID is required")
    private UUID feeCycleId;

    @NotNull(message = "Student ID is required")
    private UUID studentId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;

    @NotBlank(message = "Payment mode is required")
    private String paymentMode;

    private String transactionReference;

    private String remarks;

    /** Optional. When set, used as the fee-paid date; otherwise the server stamps the current time. */
    private LocalDate paymentDate;
}
