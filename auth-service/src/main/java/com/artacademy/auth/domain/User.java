package com.artacademy.auth.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "USERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private UUID id;

    @Column(name = "USERNAME", unique = true, nullable = false, length = 100)
    private String username;

    @Column(name = "PASSWORD", nullable = false)
    private String password;

    @Column(name = "EMAIL", length = 200)
    private String email;

    @Column(name = "PHONE", length = 30)
    private String phone;

    @Column(name = "STATUS", length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "MUST_CHANGE_PASSWORD", nullable = false)
    @Builder.Default
    private boolean mustChangePassword = false;

    @Column(name = "IS_BOOTSTRAP", nullable = false)
    @Builder.Default
    private boolean bootstrap = false;

    @Column(name = "CREATED_AT")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "UPDATED_AT")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "USER_ROLES",
            joinColumns = @JoinColumn(name = "USER_ID"),
            inverseJoinColumns = @JoinColumn(name = "ROLE_ID"))
    @Builder.Default
    private Set<Role> roles = new HashSet<>();
}
