package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

// Zero-or-one per Person. Shares the Person PK (@MapsId). Holding this profile derives the STUDENT role.
// The denormalized "other parent" (D4) — the non-login guardian, e.g. the father when the mother holds
// the login — lives inline here, not as a Person or GUARDIANSHIPS edge.
@Entity
@Table(name = "STUDENT_PROFILES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    @Column(name = "PERSON_ID")
    private UUID personId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PERSON_ID")
    private Person person;

    @Column(name = "DATE_OF_BIRTH")
    private LocalDate dob;

    @Column(name = "ADDRESS", columnDefinition = "TEXT")
    private String address;

    @Column(name = "SCHOOL_NAME")
    private String schoolName;

    @Column(name = "CLASS_NAME", length = 100)
    private String className;

    @Column(name = "ENROLLMENT_DATE")
    private LocalDate enrollmentDate;

    @Column(name = "STATUS", nullable = false)
    private String status;

    @Column(name = "OTHER_PARENT_NAME")
    private String otherParentName;

    @Column(name = "OTHER_PARENT_PHONE", length = 30)
    private String otherParentPhone;

    @Column(name = "OTHER_PARENT_REL", length = 20)
    private String otherParentRelationship;
}
