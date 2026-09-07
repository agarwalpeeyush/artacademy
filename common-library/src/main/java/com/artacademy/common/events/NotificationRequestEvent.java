package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequestEvent {
    private String recipientEmail;
    private String recipientPhone;
    private String subject;
    private String body;
    private String channel; // EMAIL, SMS, BOTH
    private Instant occurredAt;
}
