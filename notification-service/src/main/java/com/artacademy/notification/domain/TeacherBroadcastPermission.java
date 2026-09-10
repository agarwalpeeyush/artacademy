package com.artacademy.notification.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "TEACHER_BROADCAST_PERMISSIONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherBroadcastPermission {

    @Id
    @Column(name = "TEACHER_ID")
    private UUID teacherId;

    @Column(name = "CAN_BROADCAST", nullable = false)
    private boolean canBroadcast;

    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }
}
