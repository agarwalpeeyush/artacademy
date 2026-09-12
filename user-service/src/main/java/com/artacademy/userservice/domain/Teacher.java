package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "TEACHERS")
@DiscriminatorValue("TEACHER")
@PrimaryKeyJoinColumn(name = "ID")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Teacher extends User {

    @Column(name = "EMPLOYEE_CODE", length = 50, unique = true)
    private String employeeCode;

    @Column(name = "QUALIFICATION")
    private String qualification;

    @Column(name = "JOINING_DATE")
    private LocalDate joiningDate;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
