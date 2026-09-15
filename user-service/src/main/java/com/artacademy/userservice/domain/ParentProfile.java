package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

// Zero-or-one per Person. Shares the Person PK (@MapsId). Holding this profile derives the PARENT role.
@Entity
@Table(name = "PARENT_PROFILES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParentProfile {

    @Id
    @Column(name = "PERSON_ID")
    private UUID personId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PERSON_ID")
    private Person person;

    @Column(name = "OCCUPATION")
    private String occupation;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
