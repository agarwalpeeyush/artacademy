package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * A scheduled exam for a course (R19). Scheduling triggers the EXAM fee for enrolled students
 * and notifies them of the date and timings.
 */
@Entity
@Table(name = "EXAMS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "TITLE")
    private String title;

    @Column(name = "EXAM_DATE", nullable = false)
    private LocalDate examDate;

    @Column(name = "START_TIME", nullable = false)
    private LocalTime startTime;

    @Column(name = "END_TIME", nullable = false)
    private LocalTime endTime;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
