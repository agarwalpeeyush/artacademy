package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Role/username change on an EXISTING login (OQ5). Idempotent, keyed on personId: the auth consumer
// appends addedRoles, removes removedRoles, and (if renameUsernameTo is set) renames the username and
// tombstones the old one (D3/D9). No temp password here — the login already exists.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonRoleChangedEvent {
    private UUID personId;
    private String loginId;
    private List<String> addedRoles;
    private List<String> removedRoles;
    /** New username to promote to (D3), or null if the login name is unchanged. */
    private String renameUsernameTo;
    private Instant occurredAt;
}
