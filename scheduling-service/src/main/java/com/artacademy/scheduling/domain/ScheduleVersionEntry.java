package com.artacademy.scheduling.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "SCHEDULE_VERSION_ENTRIES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleVersionEntry {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "VERSION_ID", nullable = false)
    private ScheduleVersion version;

    @Column(name = "SCHEDULE_ID", nullable = false)
    private UUID scheduleId;

    @Column(name = "CLASS_ID", nullable = false)
    private UUID classId;

    @Column(name = "TEACHER_ID", nullable = false)
    private UUID teacherId;

    @Column(name = "ROOM_ID", nullable = false)
    private UUID roomId;

    @Column(name = "ROOM_NAME", length = 100)
    private String roomName;

    @Enumerated(EnumType.STRING)
    @Column(name = "DAY_OF_WEEK", nullable = false, length = 20)
    private DayOfWeek dayOfWeek;

    @Column(name = "START_TIME", nullable = false)
    private LocalTime startTime;

    @Column(name = "END_TIME", nullable = false)
    private LocalTime endTime;
}
