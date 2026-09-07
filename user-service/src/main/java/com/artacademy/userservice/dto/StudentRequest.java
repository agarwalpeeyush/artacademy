package com.artacademy.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRequest {

    private String loginId;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    private String fatherName;

    private String fatherPhone;

    private String motherName;

    private String motherPhone;

    private String guardianName;

    private String guardianPhone;

    @Email(message = "Email must be valid")
    private String email;

    private String address;

    private LocalDate enrollmentDate;

    @NotBlank(message = "Status is required")
    private String status;
}
