package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReceivedEvent {
    private UUID paymentId;
    private UUID feeCycleId;
    private UUID studentId;
    private BigDecimal amount;
    private Instant occurredAt;
}
