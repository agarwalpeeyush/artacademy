package com.artacademy.common.events;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.FeeType;
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
    private UUID classId;

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
    }
}
