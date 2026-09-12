package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "PARENTS")
@DiscriminatorValue("PARENT")
@PrimaryKeyJoinColumn(name = "ID")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Parent extends User {

    @Column(name = "PARENT_NAME")
    private String parentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "RELATIONSHIP")
    private Relationship relationship;

    @Column(name = "ADDRESS", columnDefinition = "TEXT")
    private String address;

    @Column(name = "OCCUPATION")
    private String occupation;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "PARENT_STUDENTS",
            joinColumns = @JoinColumn(name = "PARENT_ID"),
            inverseJoinColumns = @JoinColumn(name = "STUDENT_ID"))
    private Set<Student> children = new LinkedHashSet<>();

    @Column(name = "STATUS", nullable = false)
    private String status;
}
