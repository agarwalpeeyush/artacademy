package com.artacademy.auth.service;

import com.artacademy.auth.domain.Role;
import com.artacademy.auth.domain.User;
import com.artacademy.auth.dto.UserSummaryResponse;
import com.artacademy.auth.repository.RoleRepository;
import com.artacademy.auth.repository.UserRepository;
import com.artacademy.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogService auditLogService;

    public Page<UserSummaryResponse> findAll(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public UserSummaryResponse updateStatus(UUID userId, String status, String actorUsername, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        String oldStatus = user.getStatus();
        user.setStatus(status);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditLogService.log(actorUsername, "UPDATE_USER_STATUS",
                "User " + user.getUsername() + ": " + oldStatus + " → " + status, ipAddress, true);
        return toResponse(user);
    }

    public List<String> getUserRoles(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return user.getRoles().stream().map(Role::getName).collect(Collectors.toList());
    }

    @Transactional
    public UserSummaryResponse updateRoles(UUID userId, List<String> roleNames, String actorUsername, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        Set<Role> roles = roleNames.stream()
                .map(name -> roleRepository.findByName(name)
                        .orElseThrow(() -> ApiException.badRequest("Role not found: " + name)))
                .collect(Collectors.toCollection(HashSet::new));
        user.setRoles(roles);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditLogService.log(actorUsername, "UPDATE_USER_ROLES",
                "User " + user.getUsername() + " → " + roleNames, ipAddress, true);
        return toResponse(user);
    }

    private UserSummaryResponse toResponse(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .status(user.getStatus())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .build();
    }
}
