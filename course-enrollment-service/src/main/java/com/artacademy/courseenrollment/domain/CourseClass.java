package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

/**
 * A {@code CourseClass} is one running section (batch) of a {@link Course}.
 *
 * <p>The distinction:
 * <ul>
 *   <li>{@link Course} — <em>what</em> is being taught (e.g. "Classical Dance")</li>
 *   <li>{@code CourseClass} — <em>a specific group</em> learning it, with a specific teacher,
 *       room, and seat limit (e.g. "Classical Dance – Batch A")</li>
 * </ul>
 *
 * <p>Example:
 * <pre>
 *   Course:  Classical Dance (DANCE-CLS)
 *     └── CourseClass: "Classical Dance – Batch A"
 *           teacherId  → Riya Sharma
 *           roomNumber → Studio 1
 *           capacity   → 20
 *
 *     └── CourseClass: "Classical Dance – Batch B"  (different teacher / timeslot)
 *           teacherId  → Arjun Mehta
 *           roomNumber → Studio 2
 *           capacity   → 15
 * </pre>
 *
 * <p>An {@link Enrollment} references both the parent {@code Course} (for fee calculation)
 * and this {@code CourseClass} (for seat-count checks and attendance tracking).
 */
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

    @Column(name = "ROOM_ID")
    private UUID roomId;

    @Column(name = "ROOM_NAME")
    private String roomName;

    @Column(name = "CAPACITY")
    private Integer capacity;

    @Column(name = "STATUS", nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "COURSE_ID", insertable = false, updatable = false)
    private Course course;
}
