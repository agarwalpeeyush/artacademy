package com.artacademy.courseenrollment.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Principal edit of a bill: amount/due/status and an optional revenue-share override. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeBillUpdateRequest {

    private BigDecimal amountDue;
    private LocalDateTime dueDate;
    private String status;

    // Share override (both required together when overriding); auditable.
    private BigDecimal instituteShare;
    private BigDecimal teacherShare;
    private UUID overriddenBy;
}
