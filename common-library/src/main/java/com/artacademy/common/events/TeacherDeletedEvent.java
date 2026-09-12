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
public class TeacherDeletedEvent {
    /** Equals the auth user id. */
    private UUID teacherId;
    private String username;
    private Instant occurredAt;
}
