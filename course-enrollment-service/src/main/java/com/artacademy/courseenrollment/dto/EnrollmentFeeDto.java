package com.artacademy.courseenrollment.dto;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import com.artacademy.common.fee.ShareType;
import jakarta.validation.constraints.DecimalMin;
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
    @DecimalMin(value = "0.0", message = "Amount must be non-negative")
    private BigDecimal amount;

    @NotNull(message = "Cadence is required")
    private FeeCadence cadence;

    /**
     * Per-child institute-share rule (F3). Optional — null type means no institute cut. Range is
     * validated in the service (PERCENTAGE ∈ [0,100], AMOUNT ≥ 0, F10) since it depends on the type.
     */
    private ShareType instituteShareType;

    @DecimalMin(value = "0.0", message = "Institute share value must be non-negative")
    private BigDecimal instituteShareValue;
}
