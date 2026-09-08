package com.artacademy.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentRequest {

    @NotBlank(message = "Login ID is required")
    private String loginId;

    /** Optional. Blank/absent from the UI; the service defaults it before publishing the auth event. */
    private String temporaryPassword;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;

    private String relationship;

    private String phone;

    @Email(message = "Email must be valid")
    private String email;

    private String address;

    private String occupation;

    @NotNull(message = "Linked student ID is required")
    private UUID studentId;

    @NotBlank(message = "Status is required")
    private String status;

    /** Additional auth roles beyond PARENT. */
    private List<String> additionalRoles;
}
