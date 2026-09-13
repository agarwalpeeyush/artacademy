package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

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

    @ManyToMany(mappedBy = "children", fetch = FetchType.LAZY)
    private Set<Parent> parents = new LinkedHashSet<>();
}
