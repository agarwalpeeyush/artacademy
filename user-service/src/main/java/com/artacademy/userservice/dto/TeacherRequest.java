package com.artacademy.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class TeacherRequest {

    @NotBlank(message = "Login ID is required")
    private String loginId;

    @NotBlank(message = "Temporary password is required")
    private String temporaryPassword;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    @NotBlank(message = "Employee code is required")
    @Size(max = 50, message = "Employee code must not exceed 50 characters")
    private String employeeCode;

    @Email(message = "Email must be valid")
    private String email;

    private String phone;

    private String qualification;

    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    @NotBlank(message = "Status is required")
    private String status;

    /** Additional auth roles beyond TEACHER, e.g. ["PRINCIPAL", "ADMIN"]. */
    private List<String> additionalRoles;
}
