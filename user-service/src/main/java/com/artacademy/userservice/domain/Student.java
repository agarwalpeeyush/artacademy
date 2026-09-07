package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "STUDENTS")
@DiscriminatorValue("STUDENT")
@PrimaryKeyJoinColumn(name = "ID")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Student extends User {

    @Column(name = "DATE_OF_BIRTH")
    private LocalDate dob;

    @Column(name = "FATHER_NAME")
    private String fatherName;

    @Column(name = "FATHER_PHONE")
    private String fatherPhone;

    @Column(name = "MOTHER_NAME")
    private String motherName;

    @Column(name = "MOTHER_PHONE")
    private String motherPhone;

    @Column(name = "GUARDIAN_NAME")
    private String guardianName;

    @Column(name = "GUARDIAN_PHONE")
    private String guardianPhone;

    @Column(name = "EMAIL")
    private String email;

    @Column(name = "ADDRESS", columnDefinition = "TEXT")
    private String address;

    @Column(name = "ENROLLMENT_DATE")
    private LocalDate enrollmentDate;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
