package com.artacademy.common.events;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
import com.artacademy.common.fee.ShareType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentCreatedEvent {
    private UUID enrollmentId;
    private UUID studentId;
    private UUID courseId;

    /**
     * The teacher this enrollment is attributed to (F5). Stable Person id (PERSON_MODEL D5).
     * One course = one teacher; carried here and persisted downstream for per-teacher accounting.
     */
    private UUID teacherId;

    /**
     * The full fee set carried by the enrolled course. Replaces the old scalar
     * {@code admissionFee}/{@code monthlyFee} pair so one-time fees reach payment-service.
     */
    private List<FeeItem> fees;

    private Instant occurredAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeItem {
        private FeeType feeType;
        private BigDecimal amount;
        private FeeCadence cadence;

        /**
         * The institute-share <b>rule</b> frozen from the per-child enrollment values (F11).
         * Null/zero means no institute cut (teacher keeps the full billed amount). The resolved
         * amount is computed downstream by payment-service, never here.
         */
        private ShareType instituteShareType;
        private BigDecimal instituteShareValue;
    }
}
