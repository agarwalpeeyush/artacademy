package com.artacademy.attendance.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(
    name = "CLASS_SESSION",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_class_session_class_date",
        columnNames = {"CLASS_ID", "SESSION_DATE"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "CLASS_ID", nullable = false)
    private UUID classId;

    @Column(name = "COURSE_ID")
    private UUID courseId;

    @Column(name = "SESSION_DATE", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "START_TIME")
    private LocalTime startTime;

    @Column(name = "END_TIME")
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    @Builder.Default
    private ClassSessionStatus status = ClassSessionStatus.SCHEDULED;
}
