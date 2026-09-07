package com.artacademy.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private UUID id;
    private UUID userId;
    private String recipientEmail;
    private String recipientPhone;
    private String subject;
    private String body;
    private String channel;
    private String status;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
    private String errorMessage;
}
