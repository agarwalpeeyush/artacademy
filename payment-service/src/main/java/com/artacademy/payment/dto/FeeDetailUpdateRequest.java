package com.artacademy.payment.dto;

import com.artacademy.common.fee.ShareType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Edit an unbilled fee catalogue line (amount, due date, share rule). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeDetailUpdateRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", message = "Amount must be non-negative")
    private BigDecimal amount;

    private LocalDate dueDate;

    private ShareType instituteShareType;

    private BigDecimal instituteShareValue;
}
