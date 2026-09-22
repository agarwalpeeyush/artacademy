package com.artacademy.courseenrollment.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/** Principal override of the institute/teacher split on a single fee detail (F8/F12/F14). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareOverrideRequest {

    @NotNull(message = "Institute share is required")
    @DecimalMin(value = "0.0", message = "Institute share must be non-negative")
    private BigDecimal instituteShare;

    @NotNull(message = "Teacher share is required")
    @DecimalMin(value = "0.0", message = "Teacher share must be non-negative")
    private BigDecimal teacherShare;

    @NotNull(message = "Overriding principal id is required")
    private UUID overriddenBy;
}
