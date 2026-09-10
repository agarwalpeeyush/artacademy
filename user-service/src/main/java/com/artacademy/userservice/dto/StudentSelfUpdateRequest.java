package com.artacademy.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentSelfUpdateRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    @Email(message = "Email must be valid")
    private String email;

    private String address;

    private String fatherName;

    private String fatherPhone;

    private String motherName;

    private String motherPhone;

    private String guardianName;

    private String guardianPhone;
}
