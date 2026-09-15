package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

// Zero-or-one per Person. Shares the Person PK (@MapsId): PERSON_ID is both PK and FK. Holding this
// profile derives the TEACHER role (OQ2).
@Entity
@Table(name = "TEACHER_PROFILES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherProfile {

    @Id
    @Column(name = "PERSON_ID")
    private UUID personId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PERSON_ID")
    private Person person;

    @Column(name = "EMPLOYEE_CODE", length = 50, unique = true)
    private String employeeCode;

    @Column(name = "QUALIFICATION")
    private String qualification;

    @Column(name = "JOINING_DATE")
    private LocalDate joiningDate;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
