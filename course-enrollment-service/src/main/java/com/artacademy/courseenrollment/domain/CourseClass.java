package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "CLASSES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseClass {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    @Column(name = "TEACHER_ID")
    private UUID teacherId;

    @Column(name = "CLASS_NAME", nullable = false)
    private String className;

    @Column(name = "ROOM_NUMBER")
    private String roomNumber;

    @Column(name = "CAPACITY")
    private Integer capacity;

    @Column(name = "STATUS", nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "COURSE_ID", insertable = false, updatable = false)
    private Course course;
}
