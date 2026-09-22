package com.artacademy.courseenrollment.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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

    /** Display name held on the parent row (base user name is unused for parents). */
    private String parentName;

    @Pattern(regexp = "(?i)^(mother|father)?$", message = "Relationship must be MOTHER or FATHER")
    private String relationship;

    private String phone;

    @Email(message = "Email must be valid")
    private String email;

    private String address;

    private String occupation;

    /** Students to link to this parent. Optional; a parent may be created before any child link. */
    private List<UUID> childStudentIds;

    @NotBlank(message = "Status is required")
    private String status;

    /** Additional auth roles beyond PARENT. */
    private List<String> additionalRoles;
}
