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
public class TeacherCreatedEvent {
    private UUID teacherId;
    private String employeeCode;
    private String firstName;
    private String lastName;
    private String email;
    private Instant occurredAt;
}
