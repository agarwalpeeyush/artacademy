package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "COURSES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "COURSE_CODE", length = 50, unique = true, nullable = false)
    private String courseCode;

    @Column(name = "COURSE_NAME", nullable = false)
    private String courseName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "COURSE_TYPE_ID")
    private CourseType courseType;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @Column(name = "DURATION_MONTHS")
    private Integer durationMonths;

    @Column(name = "STATUS", nullable = false)
    private String status;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CourseFee> fees = new ArrayList<>();
}
