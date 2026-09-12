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
public class StudentDeletedEvent {
    /** Equals the auth user id. */
    private UUID studentId;
    private String username;
    private Instant occurredAt;
}
