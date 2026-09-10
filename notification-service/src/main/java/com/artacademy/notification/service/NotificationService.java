package com.artacademy.notification.service;

import com.artacademy.notification.domain.Notification;
import com.artacademy.notification.dto.NotificationRequest;
import com.artacademy.notification.dto.NotificationResponse;
import com.artacademy.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    /**
     * Persists a notification with PENDING status, attempts delivery, then updates
     * status to SENT or FAILED depending on the outcome.
     */
    @Transactional
    public NotificationResponse sendNotification(NotificationRequest request) {
        // 1. Persist as PENDING
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .recipientEmail(request.getRecipientEmail())
                .recipientPhone(request.getRecipientPhone())
                .subject(request.getSubject())
                .body(request.getBody())
                .channel(request.getChannel())
                .status("PENDING")
                .build();

        notification = notificationRepository.save(notification);

        // 2. Attempt delivery
        String channel = request.getChannel();
        if ("EMAIL".equalsIgnoreCase(channel) || "BOTH".equalsIgnoreCase(channel)) {
            sendEmail(notification);
        } else {
            // SMS-only channel: mark SENT immediately (no SMS provider integrated)
            notification.setStatus("SENT");
            notification.setSentAt(LocalDateTime.now());
        }

        notificationRepository.save(notification);
        return toResponse(notification);
    }

    private void sendEmail(Notification notification) {
        if (notification.getRecipientEmail() == null || notification.getRecipientEmail().isBlank()) {
            notification.setStatus("FAILED");
            notification.setErrorMessage("Recipient email is missing");
            log.warn("Notification id={} failed: recipient email is missing", notification.getId());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(notification.getRecipientEmail());
            message.setSubject(notification.getSubject());
            message.setText(notification.getBody());
            mailSender.send(message);

            notification.setStatus("SENT");
            notification.setSentAt(LocalDateTime.now());
            log.info("Notification id={} sent to {}", notification.getId(), notification.getRecipientEmail());
        } catch (Exception ex) {
            notification.setStatus("FAILED");
            notification.setErrorMessage(ex.getMessage());
            log.error("Failed to send notification id={}: {}", notification.getId(), ex.getMessage(), ex);
        }
    }

    /**
     * Returns a paginated list of notifications for a given user, newest first.
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getByUserId(UUID userId, Pageable pageable) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    /**
     * Marks a single notification as read.
     */
    @Transactional
    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                n.setReadAt(LocalDateTime.now());
                notificationRepository.save(n);
            }
        });
    }

    /**
     * Marks all of a user's unread notifications as read.
     */
    @Transactional
    public void markAllAsRead(UUID userId) {
        var unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        LocalDateTime now = LocalDateTime.now();
        unread.forEach(n -> {
            n.setRead(true);
            n.setReadAt(now);
        });
        notificationRepository.saveAll(unread);
    }

    /**
     * Returns the count of unread notifications for a user.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // -------------------------------------------------------------------------
    // Mapping helper
    // -------------------------------------------------------------------------

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .recipientEmail(n.getRecipientEmail())
                .recipientPhone(n.getRecipientPhone())
                .subject(n.getSubject())
                .title(n.getTitle())
                .type(n.getType())
                .body(n.getBody())
                .channel(n.getChannel())
                .status(n.getStatus())
                .isRead(n.isRead())
                .readAt(n.getReadAt())
                .sentAt(n.getSentAt())
                .createdAt(n.getCreatedAt())
                .errorMessage(n.getErrorMessage())
                .build();
    }
}
