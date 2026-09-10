package com.artacademy.notification.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "NOTIFICATIONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "USER_ID")
    private UUID userId;

    @Column(name = "RECIPIENT_EMAIL", length = 200)
    private String recipientEmail;

    @Column(name = "RECIPIENT_PHONE", length = 20)
    private String recipientPhone;

    @Column(name = "SUBJECT", length = 500)
    private String subject;

    @Column(name = "TITLE", length = 500)
    private String title;

    @Column(name = "TYPE", length = 50)
    private String type;

    @Column(name = "BODY", columnDefinition = "TEXT")
    private String body;

    @Column(name = "IS_READ", nullable = false)
    private boolean isRead;

    @Column(name = "READ_AT")
    private LocalDateTime readAt;

    /**
     * Notification channel: EMAIL, SMS, BOTH
     */
    @Column(name = "CHANNEL", length = 20, nullable = false)
    private String channel;

    /**
     * Delivery status: PENDING, SENT, FAILED
     */
    @Column(name = "STATUS", length = 20, nullable = false)
    private String status;

    @Column(name = "SENT_AT")
    private LocalDateTime sentAt;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "ERROR_MESSAGE", columnDefinition = "TEXT")
    private String errorMessage;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "PENDING";
        }
    }
}
