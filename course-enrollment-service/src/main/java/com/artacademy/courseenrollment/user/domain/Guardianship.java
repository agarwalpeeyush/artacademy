package com.artacademy.courseenrollment.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

// Parent<->child edge across two PERSONS (D4): only login-holding guardians get a row. The non-login
// "other parent" is denormalized on StudentProfile instead. Composite PK (guardian, student).
@Entity
@Table(name = "GUARDIANSHIPS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(Guardianship.Key.class)
public class Guardianship {

    @Id
    @Column(name = "GUARDIAN_PERSON_ID")
    private UUID guardianPersonId;

    @Id
    @Column(name = "STUDENT_PERSON_ID")
    private UUID studentPersonId;

    @Enumerated(EnumType.STRING)
    @Column(name = "RELATIONSHIP", length = 20)
    private Relationship relationship;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID guardianPersonId;
        private UUID studentPersonId;
    }
}
