package com.artacademy.courseenrollment.service;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.FeeType;
import com.artacademy.courseenrollment.client.UserServiceClient;
import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.domain.EnrollmentFee;
import com.artacademy.courseenrollment.domain.Timetable;
import com.artacademy.courseenrollment.dto.EnrollmentFeeDto;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import com.artacademy.courseenrollment.mapper.EnrollmentMapper;
import com.artacademy.courseenrollment.repository.CourseRepository;
import com.artacademy.courseenrollment.repository.EnrollmentRepository;
import com.artacademy.courseenrollment.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EnrollmentService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final Set<String> ALLOWED_STATUSES =
            Set.of("ACTIVE", "COMPLETED", "DROPPED", "SUSPENDED", "CANCELLED");

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final TimetableRepository timetableRepository;
    private final EnrollmentMapper enrollmentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final UserServiceClient userServiceClient;

    public EnrollmentResponse enrollStudent(EnrollmentRequest request) {
        // A (studentId, courseId) row may already exist because cancellation is a soft update
        // (status=CANCELLED) rather than a delete, and the pair is UNIQUE. Reactivate that row
        // instead of inserting a duplicate that would violate the unique constraint.
        Enrollment enrollment = enrollmentRepository
                .findByStudentIdAndCourseId(request.getStudentId(), request.getCourseId())
                .map(existing -> {
                    if (STATUS_ACTIVE.equals(existing.getStatus())) {
                        throw ApiException.conflict(
                                "Student id=" + request.getStudentId()
                                + " is already actively enrolled in course id=" + request.getCourseId());
                    }
                    existing.setStatus(STATUS_ACTIVE);
                    existing.setEnrollmentDate(
                            request.getEnrollmentDate() != null ? request.getEnrollmentDate() : LocalDate.now());
                    return existing;
                })
                .orElseGet(() -> {
                    Enrollment fresh = enrollmentMapper.toEntity(request);
                    fresh.setStatus(STATUS_ACTIVE);
                    if (fresh.getEnrollmentDate() == null) {
                        fresh.setEnrollmentDate(LocalDate.now());
                    }
                    return fresh;
                });

        Course course = courseRepository.findById(enrollment.getCourseId())
                .orElseThrow(() -> ApiException.notFound("Course not found with id: " + request.getCourseId()));

        // R8: the enrollment carries its own fee lines. Copy from the course by default, or use
        // the teacher's overrides when supplied. Replace any existing lines (reactivation path).
        applyFees(enrollment, resolveFees(request, course));

        // R9: assign the child to the requested course timetable slots (optional).
        if (request.getTimetableIds() != null) {
            applyTimetables(enrollment, request.getTimetableIds());
        }

        Enrollment saved = enrollmentRepository.save(enrollment);
        log.info("Enrolled student id={} in course id={}, enrollment id={}",
                saved.getStudentId(), saved.getCourseId(), saved.getId());

        publishCreatedEvent(saved);

        return enrollmentMapper.toResponse(saved);
    }

    public void cancelEnrollment(UUID id) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found with id: " + id));

        if (STATUS_CANCELLED.equals(enrollment.getStatus())) {
            throw ApiException.conflict("Enrollment id=" + id + " is already cancelled");
        }

        UUID studentId = enrollment.getStudentId();
        UUID courseId = enrollment.getCourseId();

        enrollment.setStatus(STATUS_CANCELLED);
        enrollmentRepository.save(enrollment);
        log.info("Cancelled enrollment id={} (status=CANCELLED)", id);

        EnrollmentCancelledEvent event = EnrollmentCancelledEvent.builder()
                .enrollmentId(id)
                .studentId(studentId)
                .courseId(courseId)
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ENROLLMENT_CANCELLED, String.valueOf(id), event);
        log.info("Published EnrollmentCancelledEvent for enrollment id={}", id);
    }

    public EnrollmentResponse updateStatus(UUID id, String status) {
        String normalized = status == null ? null : status.trim().toUpperCase();
        if (normalized == null || !ALLOWED_STATUSES.contains(normalized)) {
            throw ApiException.badRequest(
                    "Invalid status '" + status + "'. Allowed values: " + ALLOWED_STATUSES);
        }

        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found with id: " + id));

        enrollment.setStatus(normalized);
        Enrollment updated = enrollmentRepository.save(enrollment);
        log.info("Updated enrollment id={} status={}", id, normalized);

        return enrollmentMapper.toResponse(updated);
    }

    /**
     * Override the fee lines on an existing enrollment (R8). Persists the new amounts so future
     * recurring cycles and not-yet-generated dues bill from them. Does not re-publish
     * {@link EnrollmentCreatedEvent} — the consumer bills ONE_TIME fees on every such event, so
     * re-publishing would double-bill admission. The enroll-time publish already billed from the
     * original (possibly overridden) lines.
     */
    public EnrollmentResponse updateFees(UUID id, List<EnrollmentFeeDto> fees) {
        if (fees == null || fees.isEmpty()) {
            throw ApiException.badRequest("At least one fee line is required");
        }
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found with id: " + id));

        List<EnrollmentFee> lines = fees.stream()
                .map(enrollmentMapper::toFeeEntity)
                .toList();
        applyFees(enrollment, lines);

        Enrollment updated = enrollmentRepository.save(enrollment);
        log.info("Updated {} fee line(s) on enrollment id={}", lines.size(), id);

        return enrollmentMapper.toResponse(updated);
    }

    /**
     * Set the timetable-slot assignment for an enrollment (R9). Replaces any existing assignment;
     * an empty list clears it. Every slot must belong to the enrollment's course.
     */
    public EnrollmentResponse updateTimetables(UUID id, List<UUID> timetableIds) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found with id: " + id));

        applyTimetables(enrollment, timetableIds == null ? List.of() : timetableIds);

        Enrollment updated = enrollmentRepository.save(enrollment);
        log.info("Assigned {} timetable slot(s) to enrollment id={}",
                updated.getTimetables().size(), id);

        return enrollmentMapper.toResponse(updated);
    }

    /**
     * Resolve the fee lines for an enrollment: the teacher's overrides when supplied, otherwise a
     * verbatim copy of the course's {@link Course#getFees()}.
     */
    private List<EnrollmentFee> resolveFees(EnrollmentRequest request, Course course) {
        if (request.getFees() != null && !request.getFees().isEmpty()) {
            return request.getFees().stream()
                    .map(enrollmentMapper::toFeeEntity)
                    .toList();
        }
        return course.getFees().stream()
                .map(f -> EnrollmentFee.builder()
                        .feeType(f.getFeeType())
                        .amount(f.getAmount())
                        .cadence(f.getCadence())
                        .build())
                .toList();
    }

    /** Replace the enrollment's fee collection in place, wiring each line's back-reference. */
    private void applyFees(Enrollment enrollment, List<EnrollmentFee> lines) {
        // Reactivation path: the loaded enrollment may already own fee rows. Clearing marks them
        // for orphan-removal, but Hibernate orders the new INSERTs before those DELETEs in a single
        // flush, colliding on uq_enrollment_fee_type. Flush after clearing so the deletes land first.
        if (!enrollment.getFees().isEmpty()) {
            enrollment.getFees().clear();
            enrollmentRepository.flush();
        }
        Set<FeeType> seen = new LinkedHashSet<>();
        for (EnrollmentFee line : lines) {
            if (!seen.add(line.getFeeType())) {
                continue; // guard against a payload carrying the same fee type twice
            }
            line.setEnrollment(enrollment);
            enrollment.getFees().add(line);
        }
    }

    /**
     * Replace the enrollment's timetable-slot assignment (R9). Validates that each slot exists and
     * belongs to the enrollment's course, so a child can only be assigned to their course's slots.
     */
    private void applyTimetables(Enrollment enrollment, List<UUID> timetableIds) {
        Set<Timetable> slots = new LinkedHashSet<>();
        for (UUID timetableId : timetableIds) {
            Timetable slot = timetableRepository.findById(timetableId)
                    .orElseThrow(() -> ApiException.notFound("Timetable not found with id: " + timetableId));
            if (!slot.getCourseId().equals(enrollment.getCourseId())) {
                throw ApiException.badRequest("Timetable id=" + timetableId
                        + " does not belong to course id=" + enrollment.getCourseId());
            }
            slots.add(slot);
        }
        enrollment.getTimetables().clear();
        enrollment.getTimetables().addAll(slots);
    }

    private void publishCreatedEvent(Enrollment saved) {
        List<EnrollmentCreatedEvent.FeeItem> feeItems = saved.getFees().stream()
                .map(f -> EnrollmentCreatedEvent.FeeItem.builder()
                        .feeType(f.getFeeType())
                        .amount(f.getAmount())
                        .cadence(f.getCadence())
                        .build())
                .toList();

        EnrollmentCreatedEvent event = EnrollmentCreatedEvent.builder()
                .enrollmentId(saved.getId())
                .studentId(saved.getStudentId())
                .courseId(saved.getCourseId())
                .fees(feeItems)
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ENROLLMENT_CREATED, String.valueOf(saved.getId()), event);
        log.info("Published EnrollmentCreatedEvent for enrollment id={}", saved.getId());
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getAllEnrollments() {
        return enrich(enrollmentRepository.findAll()
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByStudentId(UUID studentId) {
        return enrich(enrollmentRepository.findByStudentId(studentId)
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByCourseId(UUID courseId) {
        return enrich(enrollmentRepository.findByCourseId(courseId)
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList());
    }

    /**
     * Base roster for a timetable slot (R10): the ACTIVE enrollments whose {@code timetables}
     * assignment includes this slot. Used by the attendance mark flow to load the students who
     * regularly attend a (course, slot) before marking.
     */
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByTimetableId(UUID timetableId) {
        return enrich(enrollmentRepository.findByTimetableId(timetableId)
                .stream()
                .filter(e -> STATUS_ACTIVE.equals(e.getStatus()))
                .map(enrollmentMapper::toResponse)
                .toList());
    }

    /**
     * Populate display names from user-service: {@code studentName} on each enrollment and
     * {@code teacherName} on each nested timetable slot. Uses one bulk lookup per name domain,
     * not per row.
     */
    private List<EnrollmentResponse> enrich(List<EnrollmentResponse> responses) {
        if (responses.isEmpty()) {
            return responses;
        }
        Map<UUID, String> studentNames = userServiceClient.fetchStudentNames();
        Map<UUID, String> teacherNames = null;
        for (EnrollmentResponse r : responses) {
            r.setStudentName(studentNames.get(r.getStudentId()));
            if (r.getTimetables() != null && !r.getTimetables().isEmpty()) {
                if (teacherNames == null) {
                    teacherNames = userServiceClient.fetchTeacherNames();
                }
                for (var t : r.getTimetables()) {
                    t.setTeacherName(teacherNames.get(t.getTeacherId()));
                }
            }
        }
        return responses;
    }
}
