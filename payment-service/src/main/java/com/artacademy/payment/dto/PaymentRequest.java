package com.artacademy.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** A student-level payment: the tendered amount is settled against outstanding bills by waterfall. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @NotNull(message = "Student ID is required")
    private UUID studentId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;

    private String paymentMode;

    private String transactionReference;

    private String remarks;

    /** The date the fee was paid, entered when marking payment complete. */
    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;
}
