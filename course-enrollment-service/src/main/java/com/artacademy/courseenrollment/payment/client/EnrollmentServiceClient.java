package com.artacademy.courseenrollment.payment.client;

import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import com.artacademy.courseenrollment.payment.dto.ScopedStudent;
import com.artacademy.courseenrollment.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * In-process adapter to the enrollment domain, used by the fee/bill logic. Formerly an HTTP client
 * to course-enrollment-service; now that the two live in one service it delegates directly to
 * {@link EnrollmentService}, so there is no network hop and no system-JWT minting.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EnrollmentServiceClient {

    private final EnrollmentService enrollmentService;

    /** Enrollment date for back-fill; null (logged) if the lookup fails. */
    public LocalDate fetchEnrollmentDate(UUID enrollmentId) {
        try {
            EnrollmentResponse enrollment = enrollmentService.getById(enrollmentId);
            return enrollment == null ? null : enrollment.getEnrollmentDate();
        } catch (Exception e) {
            log.warn("Failed to fetch enrollment date for enrollmentId={}: {}", enrollmentId, e.getMessage());
            return null;
        }
    }

    /** Enrollment ids for a course cohort (used to batch-bill EXAM fees). */
    public List<UUID> fetchEnrollmentIdsForCourse(UUID courseId) {
        List<UUID> ids = new ArrayList<>();
        try {
            for (EnrollmentResponse e : enrollmentService.getEnrollmentsByCourseId(courseId)) {
                if (e.getId() != null) {
                    ids.add(e.getId());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch enrollment ids for courseId={}: {}", courseId, e.getMessage());
        }
        return ids;
    }

    /**
     * Name-resolved students for the fee picker. When {@code teacherId} is non-null the list is
     * scoped to that teacher's enrollments; otherwise every enrollment is returned.
     */
    public List<ScopedStudent> fetchScopedStudents(UUID teacherId) {
        List<ScopedStudent> students = new ArrayList<>();
        try {
            List<EnrollmentResponse> enrollments = teacherId != null
                    ? enrollmentService.getEnrollmentsByTeacherId(teacherId)
                    : enrollmentService.getAllEnrollments();
            for (EnrollmentResponse e : enrollments) {
                students.add(ScopedStudent.builder()
                        .studentId(e.getStudentId())
                        .enrollmentId(e.getId())
                        .courseId(e.getCourseId())
                        .teacherId(e.getTeacherId())
                        .studentName(e.getStudentName())
                        .courseName(e.getCourseName())
                        .build());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch scoped students (teacherId={}): {}", teacherId, e.getMessage());
        }
        return students;
    }
}
