package com.artacademy.auth.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "AUDIT_LOGS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "USERNAME", nullable = false, length = 100)
    private String username;

    @Column(name = "ACTION", nullable = false, length = 100)
    private String action;

    @Column(name = "DETAIL", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "IP_ADDRESS", length = 50)
    private String ipAddress;

    @Column(name = "SUCCESS", nullable = false)
    private boolean success;

    @Column(name = "OCCURRED_AT", nullable = false)
    @Builder.Default
    private Instant occurredAt = Instant.now();
}
