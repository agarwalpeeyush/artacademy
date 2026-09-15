package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

// The account. One row per human; role-profiles (teacher/student/parent) hang off it via a shared PK,
// so a single Person accumulates roles. ID is the stable identity (== auth User.id); LOGIN_ID is a
// credential that may change on staff promotion (D3); PHONE_NUMBER is an indexed lookup key (D2), not unique.
@Entity
@Table(name = "PERSONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "ID")
    private UUID id;

    @Column(name = "LOGIN_ID", unique = true)
    private String loginId;

    @Column(name = "FIRST_NAME", nullable = false)
    private String firstName;

    @Column(name = "LAST_NAME")
    private String lastName;

    @Column(name = "EMAIL")
    private String email;

    @Column(name = "PHONE_NUMBER")
    private String phoneNumber;

    @Column(name = "STATUS", nullable = false)
    private String status;

    // Elevated roles with no profile (PRINCIPAL/ADMIN), granted explicitly (OQ2). Comma-joined in DB.
    @Convert(converter = com.artacademy.userservice.domain.CsvRolesConverter.class)
    @Column(name = "ELEVATED_ROLES")
    @Builder.Default
    private Set<String> elevatedRoles = new LinkedHashSet<>();
}
