package com.artacademy.notification.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.notification.dto.AnnouncementRequest;
import com.artacademy.notification.dto.AnnouncementResponse;
import com.artacademy.notification.dto.TeacherPermissionResponse;
import com.artacademy.notification.service.AnnouncementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/notifications/announcements")
@RequiredArgsConstructor
@Tag(name = "Announcements", description = "Broadcast announcements and manage teacher permissions")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    /**
     * Broadcast an announcement. PRINCIPAL always allowed; TEACHER only when granted
     * broadcast permission (verified server-side against the passed senderUserId).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Broadcast an announcement")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> broadcast(
            @Valid @RequestBody AnnouncementRequest request) {
        if ("ROLE_TEACHER".equals(request.getSenderRole()) || "TEACHER".equals(request.getSenderRole())) {
            if (request.getSenderUserId() == null || !announcementService.canBroadcast(request.getSenderUserId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Teacher does not have broadcast permission");
            }
        }
        AnnouncementResponse response = announcementService.broadcast(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "List announcement history (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<Page<AnnouncementResponse>>> list(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(announcementService.list(pageable)));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "List all teacher broadcast permissions (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<List<TeacherPermissionResponse>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.success(announcementService.getAllPermissions()));
    }

    @GetMapping("/permissions/{teacherId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a teacher's broadcast permission")
    public ResponseEntity<ApiResponse<TeacherPermissionResponse>> getPermission(
            @PathVariable UUID teacherId) {
        return ResponseEntity.ok(ApiResponse.success(announcementService.getPermission(teacherId)));
    }

    @PutMapping("/permissions/{teacherId}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Set a teacher's broadcast permission (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<TeacherPermissionResponse>> setPermission(
            @PathVariable UUID teacherId,
            @RequestBody Map<String, Boolean> body) {
        boolean canBroadcast = Boolean.TRUE.equals(body.get("canBroadcast"));
        return ResponseEntity.ok(ApiResponse.success(
                announcementService.setPermission(teacherId, canBroadcast)));
    }
}
