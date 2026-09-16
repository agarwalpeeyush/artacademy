package com.artacademy.courseenrollment.dto;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.ShareType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class EnrollmentFeeDto {

    private UUID id;

    @NotBlank(message = "Fee type is required")
    @Size(max = 50, message = "Fee type code must not exceed 50 characters")
    private String feeType;

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

    /**
     * When this fee falls due. Optional on input: omit to let the service compute it from the
     * cadence (ONE_TIME → enrollment date; MONTHLY → enrollment date as the first due date).
     * Supply a value to override as teacher/principal. Always populated on responses.
     */
    private LocalDate dueDate;
}
