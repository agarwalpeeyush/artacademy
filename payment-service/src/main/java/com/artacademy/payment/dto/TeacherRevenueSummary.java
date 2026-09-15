package com.artacademy.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Per-teacher revenue rollup over fully-PAID fee details (F9): the amount collected, the institute's
 * commission, and the teacher's net share, all using effective (override-aware) shares.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherRevenueSummary {

    private UUID teacherId;
    private BigDecimal collected;
    private BigDecimal instituteShare;
    private BigDecimal teacherShare;
    private long paidDetailCount;
}
