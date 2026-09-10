package com.artacademy.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Body is required")
    private String body;

    /**
     * Target audience: ALL_STUDENTS, ALL_TEACHERS, TEACHER_STUDENTS
     */
    @NotBlank(message = "Audience is required")
    private String audience;

    private UUID senderUserId;

    private String senderRole;

    @NotEmpty(message = "At least one recipient is required")
    @NotNull
    private List<UUID> recipientUserIds;
}
