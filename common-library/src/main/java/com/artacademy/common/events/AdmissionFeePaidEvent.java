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
public class AdmissionFeePaidEvent {
    private UUID enrollmentId;
    private UUID studentId;
    private UUID feeCycleId;
    private Instant occurredAt;
}
