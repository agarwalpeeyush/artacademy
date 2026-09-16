package com.artacademy.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** A STUDENT_FEE_DETAIL catalogue line (editable before a bill is generated). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeDetailDto {

    private UUID id;
    private UUID enrollmentId;
    private String feeType;
    private BigDecimal amount;
    private String cadence;
    private LocalDate dueDate;
    private String instituteShareType;
    private BigDecimal instituteShareValue;
}
