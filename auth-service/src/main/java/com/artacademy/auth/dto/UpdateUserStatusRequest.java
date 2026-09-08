package com.artacademy.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    @NotBlank(message = "Status is required")
    private String status; // ACTIVE | INACTIVE | SUSPENDED
}
