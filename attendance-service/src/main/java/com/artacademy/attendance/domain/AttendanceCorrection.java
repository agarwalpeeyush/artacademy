package com.artacademy.attendance.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ATTENDANCE_CORRECTION")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceCorrection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "STUDENT_ATTENDANCE_ID", nullable = false)
    private UUID studentAttendanceId;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "CLASS_ID", nullable = false)
    private UUID classId;

    @Column(name = "ATTENDANCE_DATE", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "REQUESTED_STATUS", nullable = false, length = 20)
    private AttendanceStatus requestedStatus;

    @Column(name = "REASON", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "REQUESTED_BY_TEACHER_ID", nullable = false)
    private UUID requestedByTeacherId;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    @Builder.Default
    private CorrectionStatus status = CorrectionStatus.PENDING;

    @Column(name = "REVIEWED_BY_PRINCIPAL_ID")
    private UUID reviewedByPrincipalId;

    @Column(name = "REVIEW_NOTE", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "CREATED_AT", nullable = false)
    private Instant createdAt;

    @Column(name = "REVIEWED_AT")
    private Instant reviewedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
