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
public class FeeGeneratedEvent {
    private UUID feeCycleId;
    private UUID studentId;
    private Integer billingMonth;
    private Integer billingYear;
    private BigDecimal totalAmount;
    private Instant occurredAt;
}
