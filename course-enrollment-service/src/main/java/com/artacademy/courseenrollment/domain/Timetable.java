package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "TIMETABLES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timetable {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "TEACHER_ID", nullable = false)
    private UUID teacherId;

    @Column(name = "START_TIME", nullable = false)
    private LocalTime startTime;

    @Column(name = "END_TIME", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "DAY_OF_WEEK", nullable = false, length = 20)
    private DayOfWeek dayOfWeek;
}
