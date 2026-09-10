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
public class AnnouncementResponse {

    private UUID id;
    private String title;
    private String body;
    private String audience;
    private UUID senderUserId;
    private String senderRole;
    private int recipientCount;
    private LocalDateTime createdAt;
}
