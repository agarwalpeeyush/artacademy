package com.artacademy.auth.service;

import com.artacademy.auth.domain.RefreshToken;
import com.artacademy.auth.domain.Role;
import com.artacademy.auth.domain.User;
import com.artacademy.auth.dto.*;
import com.artacademy.auth.repository.RoleRepository;
import com.artacademy.auth.repository.UserRepository;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetService passwordResetService;
    private final AuditLogService auditLogService;
    private final LoginAttemptService loginAttemptService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request, String ipAddress) {
        if (loginAttemptService.isBlocked(request.getUsername())) {
            long seconds = loginAttemptService.secondsUntilUnlock(request.getUsername());
            throw ApiException.forbidden("Account temporarily locked. Try again in " + seconds + " seconds.");
        }
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(request.getUsername());
            auditLogService.log(request.getUsername(), "LOGIN_FAILED", "Invalid credentials", ipAddress, false);
            throw ApiException.badRequest("Invalid credentials");
        }
        if (!"ACTIVE".equals(user.getStatus())) {
            loginAttemptService.recordFailure(request.getUsername());
            auditLogService.log(request.getUsername(), "LOGIN_FAILED", "Account not active", ipAddress, false);
            throw ApiException.forbidden("Account is not active");
        }
        loginAttemptService.recordSuccess(request.getUsername());
        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        String accessToken = jwtUtil.generateToken(user.getUsername(), roles);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        auditLogService.log(user.getUsername(), "LOGIN", null, ipAddress, true);
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .id(user.getId().toString())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }

    @Transactional
    public void logout(String username, String ipAddress) {
        userRepository.findByUsername(username).ifPresent(refreshTokenService::deleteByUser);
        auditLogService.log(username, "LOGOUT", null, ipAddress, true);
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenService.findByToken(request.getRefreshToken());
        refreshTokenService.verifyExpiry(refreshToken);
        User user = refreshToken.getUser();
        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        String accessToken = jwtUtil.generateToken(user.getUsername(), roles);
        RefreshToken newRefresh = refreshTokenService.createRefreshToken(user);
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefresh.getToken())
                .tokenType("Bearer")
                .id(user.getId().toString())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request, String ipAddress) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            auditLogService.log(username, "CHANGE_PASSWORD_FAILED", "Incorrect current password", ipAddress, false);
            throw ApiException.badRequest("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditLogService.log(username, "CHANGE_PASSWORD", null, ipAddress, true);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        passwordResetService.initiateReset(request.getEmail());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, String ipAddress) {
        // Resolve the username from the token for audit purposes before resetting
        String username = "unknown";
        try {
            username = passwordResetService.resolveUsername(request.getToken());
        } catch (Exception ignored) {}
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        auditLogService.log(username, "RESET_PASSWORD", null, ipAddress, true);
    }

    public User getMe(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
