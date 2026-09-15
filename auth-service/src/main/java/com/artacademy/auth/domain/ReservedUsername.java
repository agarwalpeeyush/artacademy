package com.artacademy.auth.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

// A username retired by a promotion (D3/D9). Its presence blocks reassignment to another Person.
@Entity
@Table(name = "RESERVED_USERNAMES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservedUsername {

    @Id
    @Column(name = "USERNAME", length = 100)
    private String username;

    @Column(name = "PERSON_ID")
    private UUID personId;

    @Column(name = "RESERVED_AT", nullable = false)
    @Builder.Default
    private Instant reservedAt = Instant.now();
}
