package com.artacademy.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    private String recipientEmail;

    private String recipientPhone;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Body is required")
    private String body;

    /**
     * Notification channel: EMAIL, SMS, BOTH
     */
    @NotBlank(message = "Channel is required")
    private String channel;

    private UUID userId;
}
