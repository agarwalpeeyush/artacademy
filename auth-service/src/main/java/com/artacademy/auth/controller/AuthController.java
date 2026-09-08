package com.artacademy.auth.controller;

import com.artacademy.auth.domain.Role;
import com.artacademy.auth.domain.User;
import com.artacademy.auth.dto.*;
import com.artacademy.auth.service.AuditLogService;
import com.artacademy.auth.service.AuthService;
import com.artacademy.auth.service.UserManagementService;
import com.artacademy.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Auth APIs")
public class AuthController {

    private final AuthService authService;
    private final AuditLogService auditLogService;
    private final UserManagementService userManagementService;

    @PostMapping("/login")
    @Operation(summary = "Login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.login(request, getIp(httpRequest))));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal String username,
            HttpServletRequest httpRequest) {
        authService.logout(username, getIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Logged out", null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.refresh(request)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal String username,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        authService.changePassword(username, request, getIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Password changed", null));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset email")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("If your email is registered, a reset token has been sent", null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using token")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        authService.resetPassword(request, getIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(@AuthenticationPrincipal String username) {
        User user = authService.getMe(username);
        Map<String, Object> profile = Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "roles", user.getRoles().stream().map(Role::getName).collect(Collectors.toList()),
                "status", user.getStatus()
        );
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "View audit logs (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> auditLogs(
            @RequestParam(required = false) String username,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AuditLogResponse> page = (username != null && !username.isBlank())
                ? auditLogService.findByUsername(username, pageable)
                : auditLogService.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/users")
    @Operation(summary = "List all users (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<Page<UserSummaryResponse>>> listUsers(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.findAll(pageable)));
    }

    @PatchMapping("/users/{id}/status")
    @Operation(summary = "Update user account status (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal String username,
            HttpServletRequest httpRequest) {
        UserSummaryResponse updated = userManagementService.updateStatus(id, request.getStatus(), username, getIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @GetMapping("/users/{id}/roles")
    @Operation(summary = "Get roles for a user (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<List<String>>> getUserRoles(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.getUserRoles(id)));
    }

    @PutMapping("/users/{id}/roles")
    @Operation(summary = "Replace all roles for a user (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> updateUserRoles(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRolesRequest request,
            @AuthenticationPrincipal String username,
            HttpServletRequest httpRequest) {
        UserSummaryResponse updated = userManagementService.updateRoles(id, request.getRoles(), username, getIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
    }
}
