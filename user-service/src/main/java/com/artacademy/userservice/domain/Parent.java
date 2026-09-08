package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "PARENTS")
@DiscriminatorValue("PARENT")
@PrimaryKeyJoinColumn(name = "ID")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Parent extends User {

    @Column(name = "RELATIONSHIP")
    private String relationship;

    @Column(name = "PHONE")
    private String phone;

    @Column(name = "EMAIL")
    private String email;

    @Column(name = "ADDRESS", columnDefinition = "TEXT")
    private String address;

    @Column(name = "OCCUPATION")
    private String occupation;

    @Column(name = "STUDENT_ID")
    private UUID studentId;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
