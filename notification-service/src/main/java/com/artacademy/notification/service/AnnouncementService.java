package com.artacademy.notification.service;

import com.artacademy.notification.domain.Announcement;
import com.artacademy.notification.domain.Notification;
import com.artacademy.notification.domain.TeacherBroadcastPermission;
import com.artacademy.notification.dto.AnnouncementRequest;
import com.artacademy.notification.dto.AnnouncementResponse;
import com.artacademy.notification.dto.TeacherPermissionResponse;
import com.artacademy.notification.repository.AnnouncementRepository;
import com.artacademy.notification.repository.NotificationRepository;
import com.artacademy.notification.repository.TeacherBroadcastPermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final NotificationRepository notificationRepository;
    private final TeacherBroadcastPermissionRepository permissionRepository;

    /**
     * Persists an announcement and fans it out to one in-app notification per recipient.
     * Inbox-only: notifications are stored as SENT with no email/SMS delivery.
     */
    @Transactional
    public AnnouncementResponse broadcast(AnnouncementRequest request) {
        List<UUID> recipients = request.getRecipientUserIds();

        Announcement announcement = Announcement.builder()
                .title(request.getTitle())
                .body(request.getBody())
                .audience(request.getAudience())
                .senderUserId(request.getSenderUserId())
                .senderRole(request.getSenderRole())
                .recipientCount(recipients.size())
                .build();
        announcement = announcementRepository.save(announcement);

        LocalDateTime now = LocalDateTime.now();
        List<Notification> notifications = new ArrayList<>();
        for (UUID recipientId : recipients) {
            notifications.add(Notification.builder()
                    .userId(recipientId)
                    .title(request.getTitle())
                    .subject(request.getTitle())
                    .body(request.getBody())
                    .type("ANNOUNCEMENT")
                    .channel("NONE")
                    .status("SENT")
                    .isRead(false)
                    .sentAt(now)
                    .build());
        }
        notificationRepository.saveAll(notifications);

        log.info("Announcement id={} broadcast to {} recipients (audience={})",
                announcement.getId(), recipients.size(), request.getAudience());

        return toResponse(announcement);
    }

    @Transactional(readOnly = true)
    public Page<AnnouncementResponse> list(Pageable pageable) {
        return announcementRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<TeacherPermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(p -> TeacherPermissionResponse.builder()
                        .teacherId(p.getTeacherId())
                        .canBroadcast(p.isCanBroadcast())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public TeacherPermissionResponse getPermission(UUID teacherId) {
        boolean can = canBroadcast(teacherId);
        return TeacherPermissionResponse.builder()
                .teacherId(teacherId)
                .canBroadcast(can)
                .build();
    }

    @Transactional
    public TeacherPermissionResponse setPermission(UUID teacherId, boolean canBroadcast) {
        TeacherBroadcastPermission permission = permissionRepository.findByTeacherId(teacherId)
                .orElseGet(() -> TeacherBroadcastPermission.builder()
                        .teacherId(teacherId)
                        .build());
        permission.setCanBroadcast(canBroadcast);
        permissionRepository.save(permission);
        return TeacherPermissionResponse.builder()
                .teacherId(teacherId)
                .canBroadcast(canBroadcast)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean canBroadcast(UUID teacherId) {
        return permissionRepository.findByTeacherId(teacherId)
                .map(TeacherBroadcastPermission::isCanBroadcast)
                .orElse(false);
    }

    private AnnouncementResponse toResponse(Announcement a) {
        return AnnouncementResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .body(a.getBody())
                .audience(a.getAudience())
                .senderUserId(a.getSenderUserId())
                .senderRole(a.getSenderRole())
                .recipientCount(a.getRecipientCount())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
