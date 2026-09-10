package com.artacademy.notification.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ANNOUNCEMENTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "TITLE", length = 500, nullable = false)
    private String title;

    @Column(name = "BODY", columnDefinition = "TEXT", nullable = false)
    private String body;

    /**
     * Target audience: ALL_STUDENTS, ALL_TEACHERS, TEACHER_STUDENTS
     */
    @Column(name = "AUDIENCE", length = 30, nullable = false)
    private String audience;

    @Column(name = "SENDER_USER_ID")
    private UUID senderUserId;

    @Column(name = "SENDER_ROLE", length = 30)
    private String senderRole;

    @Column(name = "RECIPIENT_COUNT", nullable = false)
    private int recipientCount;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
