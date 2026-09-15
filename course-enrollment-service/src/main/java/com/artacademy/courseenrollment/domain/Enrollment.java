package com.artacademy.courseenrollment.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
    name = "ENROLLMENTS",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_enrollment_student_course",
        columnNames = {"STUDENT_ID", "COURSE_ID"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "COURSE_ID", nullable = false)
    private UUID courseId;

    // F5: the teacher this enrollment is attributed to. One course = one teacher; stored directly
    // (not derived from timetables) and carried on the created event for per-teacher accounting.
    @Column(name = "TEACHER_ID", nullable = false)
    private UUID teacherId;

    @Column(name = "ENROLLMENT_DATE", nullable = false)
    private LocalDate enrollmentDate;

    @Column(name = "STATUS", length = 20, nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "COURSE_ID", insertable = false, updatable = false)
    private Course course;

    @OneToMany(mappedBy = "enrollment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EnrollmentFee> fees = new ArrayList<>();

    // R9: the course timetable slots this child is assigned to attend. The row in the join
    // table is what makes the child part of a slot's roster; deleting the enrollment cascades.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "ENROLLMENT_TIMETABLES",
        joinColumns = @JoinColumn(name = "ENROLLMENT_ID"),
        inverseJoinColumns = @JoinColumn(name = "TIMETABLE_ID")
    )
    @Builder.Default
    private Set<Timetable> timetables = new LinkedHashSet<>();
}
