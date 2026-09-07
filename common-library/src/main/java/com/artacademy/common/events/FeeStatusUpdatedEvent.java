package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeStatusUpdatedEvent {
    private UUID feeCycleId;
    private UUID studentId;
    private String status;
    private Instant occurredAt;
}
