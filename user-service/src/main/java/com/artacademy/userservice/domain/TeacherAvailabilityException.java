package com.artacademy.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "TEACHER_AVAILABILITY_EXCEPTIONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherAvailabilityException {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "ID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "TEACHER_ID", nullable = false)
    private Person teacher;

    @Column(name = "EXCEPTION_DATE", nullable = false)
    private LocalDate date;

    @Column(name = "REASON", length = 255)
    private String reason;

    @Column(name = "UNAVAILABLE_ALL_DAY", nullable = false)
    private boolean unavailableAllDay;

    @Column(name = "START_TIME")
    private LocalTime startTime;

    @Column(name = "END_TIME")
    private LocalTime endTime;
}
