package com.artacademy.userservice.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.userservice.service.UserAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Cross-cutting user account APIs")
public class UserController {

    private final UserAccountService userAccountService;

    @GetMapping("/login-id/available")
    @Operation(summary = "Check whether a login ID is available across all users")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkLoginId(
            @RequestParam String loginId) {
        boolean available = userAccountService.isLoginIdAvailable(loginId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("available", available)));
    }
}
