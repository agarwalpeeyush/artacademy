package com.artacademy.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentResponse {

    private UUID id;
    private String loginId;
    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String fatherName;
    private String motherName;
    private String guardianName;
    private String email;
    private String address;
    private LocalDate enrollmentDate;
    private String status;
}
