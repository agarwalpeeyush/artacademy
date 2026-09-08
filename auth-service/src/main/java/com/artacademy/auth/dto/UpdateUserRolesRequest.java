package com.artacademy.auth.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UpdateUserRolesRequest {
    @NotEmpty(message = "At least one role is required")
    private List<String> roles;
}
