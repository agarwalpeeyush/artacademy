package com.artacademy.courseenrollment.dto;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import jakarta.validation.constraints.NotNull;
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
public class EnrollmentFeeDto {

    private UUID id;

    @NotNull(message = "Fee type is required")
    private FeeType feeType;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotNull(message = "Cadence is required")
    private FeeCadence cadence;
}
