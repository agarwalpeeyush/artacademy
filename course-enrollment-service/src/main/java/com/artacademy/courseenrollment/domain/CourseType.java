package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

/**
 * Open-ended catalog of course types (Drawing, Academics, Examination, Specialized Craft, ...).
 * New types are added as data (R4) — no code enum.
 */
@Entity
@Table(name = "COURSE_TYPES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseType {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "CODE", length = 50, unique = true, nullable = false)
    private String code;

    @Column(name = "NAME", nullable = false)
    private String name;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
