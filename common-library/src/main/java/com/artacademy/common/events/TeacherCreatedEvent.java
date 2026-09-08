package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherCreatedEvent {
    private UUID teacherId;
    private String username;
    private String email;
    private String temporaryPassword;
    private String employeeCode;
    private String firstName;
    private String lastName;
    /** Auth roles to assign. Defaults to ["TEACHER"] if not supplied. */
    private List<String> roles;
    private Instant occurredAt;
}
