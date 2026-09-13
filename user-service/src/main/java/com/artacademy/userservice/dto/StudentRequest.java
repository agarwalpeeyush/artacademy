package com.artacademy.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRequest {

    @NotBlank(message = "Login ID is required")
    private String loginId;

    /** Optional. Blank/absent from the UI; the service defaults it before publishing the auth event. */
    private String temporaryPassword;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    private String fatherName;

    private String fatherPhone;

    private String motherName;

    private String motherPhone;

    @Email(message = "Email must be valid")
    private String email;

    private String address;

    private String schoolName;

    private String className;

    private LocalDate enrollmentDate;

    @NotBlank(message = "Status is required")
    private String status;

    /** Additional auth roles beyond STUDENT, e.g. ["TEACHER"]. */
    private List<String> additionalRoles;
}
