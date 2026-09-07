package com.artacademy.notification.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.notification.dto.NotificationRequest;
import com.artacademy.notification.dto.NotificationResponse;
import com.artacademy.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Send and query notifications")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Send a notification manually. Accessible only by PRINCIPAL role.
     */
    @PostMapping("/send")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Send a notification (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<NotificationResponse>> sendNotification(
            @Valid @RequestBody NotificationRequest request) {
        NotificationResponse response = notificationService.sendNotification(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Get paginated notifications for a specific user. Requires authentication.
     */
    @GetMapping("/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get notifications for a user (paginated)")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getByUserId(
            @PathVariable UUID userId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<NotificationResponse> page = notificationService.getByUserId(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }
}
