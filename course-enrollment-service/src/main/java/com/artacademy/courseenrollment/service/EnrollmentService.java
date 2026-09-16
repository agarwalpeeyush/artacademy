package com.artacademy.courseenrollment.service;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.ShareType;
import com.artacademy.courseenrollment.client.UserServiceClient;
import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.domain.CourseFee;
import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.domain.EnrollmentFee;
import com.artacademy.courseenrollment.domain.FeeType;
import com.artacademy.courseenrollment.domain.Timetable;
import com.artacademy.courseenrollment.dto.EnrollmentFeeDto;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import com.artacademy.courseenrollment.mapper.EnrollmentMapper;
import com.artacademy.courseenrollment.repository.CourseRepository;
import com.artacademy.courseenrollment.repository.EnrollmentRepository;
import com.artacademy.courseenrollment.repository.FeeTypeRepository;
import com.artacademy.courseenrollment.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final FeeTypeRepository feeTypeRepository;
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
        applyFees(enrollment, resolveFees(request, course, enrollment.getEnrollmentDate()));

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
     * Override the fee lines on an existing enrollment (R8/F3). Persists the new per-child amounts
     * and institute-share rules, then re-publishes {@link EnrollmentCreatedEvent} so payment-service
     * updates the not-yet-paid details (F13). The consumer is idempotent and leaves PAID details
     * frozen (F4) — those change only via a principal override (F8).
     */
    public EnrollmentResponse updateFees(UUID id, List<EnrollmentFeeDto> fees) {
        if (fees == null || fees.isEmpty()) {
            throw ApiException.badRequest("At least one fee line is required");
        }
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found with id: " + id));

        List<EnrollmentFee> lines = fees.stream()
                .map(dto -> {
                    ShareRuleValidator.validate(dto.getInstituteShareType(), dto.getInstituteShareValue(),
                            "enrollment fee " + dto.getFeeType());
                    return EnrollmentFee.builder()
                            .feeType(resolveFeeType(dto.getFeeType()))
                            .amount(dto.getAmount())
                            .cadence(dto.getCadence())
                            .dueDate(dto.getDueDate() != null
                                    ? dto.getDueDate()
                                    : defaultDueDate(enrollment.getEnrollmentDate()))
                            .instituteShareType(dto.getInstituteShareType())
                            .instituteShareValue(dto.getInstituteShareValue())
                            .build();
                })
                .toList();
        applyFees(enrollment, lines);

        Enrollment updated = enrollmentRepository.save(enrollment);
        log.info("Updated {} fee line(s) on enrollment id={}", lines.size(), id);

        publishCreatedEvent(updated);

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
     * Resolve the fee lines for an enrollment. Course fees are the template of defaults (F3): each
     * line is pre-filled from the matching {@link CourseFee} (amount + institute-share rule). When
     * the teacher supplies overrides, those per-child amounts and share rules win; a line's share
     * rule falls back to the course default only when the override omits it. Validated per F10.
     */
    private List<EnrollmentFee> resolveFees(EnrollmentRequest request, Course course, LocalDate enrollmentDate) {
        Map<String, CourseFee> template = course.getFees().stream()
                .collect(Collectors.toMap(f -> f.getFeeType().getCode(), f -> f, (a, b) -> a, LinkedHashMap::new));

        if (request.getFees() == null || request.getFees().isEmpty()) {
            return template.values().stream()
                    .map(f -> EnrollmentFee.builder()
                            .feeType(f.getFeeType())
                            .amount(f.getAmount())
                            .cadence(f.getCadence())
                            .dueDate(defaultDueDate(enrollmentDate))
                            .instituteShareType(f.getInstituteShareType())
                            .instituteShareValue(f.getInstituteShareValue())
                            .build())
                    .toList();
        }

        return request.getFees().stream()
                .map(dto -> {
                    CourseFee def = template.get(dto.getFeeType());
                    ShareType shareType = dto.getInstituteShareType() != null
                            ? dto.getInstituteShareType()
                            : (def != null ? def.getInstituteShareType() : null);
                    BigDecimal shareValue = dto.getInstituteShareType() != null
                            ? dto.getInstituteShareValue()
                            : (def != null ? def.getInstituteShareValue() : null);
                    ShareRuleValidator.validate(shareType, shareValue,
                            "enrollment fee " + dto.getFeeType());
                    LocalDate dueDate = dto.getDueDate() != null
                            ? dto.getDueDate()
                            : defaultDueDate(enrollmentDate);
                    return EnrollmentFee.builder()
                            .feeType(def != null ? def.getFeeType() : resolveFeeType(dto.getFeeType()))
                            .amount(dto.getAmount())
                            .cadence(dto.getCadence())
                            .dueDate(dueDate)
                            .instituteShareType(shareType)
                            .instituteShareValue(shareValue)
                            .build();
                })
                .toList();
    }

    /**
     * Default due date at enroll time (overridable by teacher/principal). Both ONE_TIME and the
     * first MONTHLY due date land on the enrollment date; subsequent monthly cycles are billed on
     * the 1st by payment-service.
     */
    private LocalDate defaultDueDate(LocalDate enrollmentDate) {
        return enrollmentDate != null ? enrollmentDate : LocalDate.now();
    }

    private FeeType resolveFeeType(String code) {
        if (code == null || code.isBlank()) {
            throw ApiException.badRequest("Fee type code is required");
        }
        return feeTypeRepository.findById(code)
                .orElseThrow(() -> ApiException.badRequest("Unknown fee type code: " + code));
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
        Set<String> seen = new LinkedHashSet<>();
        for (EnrollmentFee line : lines) {
            if (!seen.add(line.getFeeType().getCode())) {
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
                        .feeType(f.getFeeType().getCode())
                        .amount(f.getAmount())
                        .cadence(f.getCadence())
                        .dueDate(f.getDueDate())
                        .instituteShareType(f.getInstituteShareType())
                        .instituteShareValue(f.getInstituteShareValue())
                        .build())
                .toList();

        EnrollmentCreatedEvent event = EnrollmentCreatedEvent.builder()
                .enrollmentId(saved.getId())
                .studentId(saved.getStudentId())
                .courseId(saved.getCourseId())
                .teacherId(saved.getTeacherId())
                .fees(feeItems)
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ENROLLMENT_CREATED, String.valueOf(saved.getId()), event);
        log.info("Published EnrollmentCreatedEvent for enrollment id={} teacherId={}",
                saved.getId(), saved.getTeacherId());
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

    @Transactional(readOnly = true)
    public EnrollmentResponse getById(UUID id) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Enrollment not found with id: " + id));
        return enrich(List.of(enrollmentMapper.toResponse(enrollment))).get(0);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByTeacherId(UUID teacherId) {
        return enrich(enrollmentRepository.findByTeacherId(teacherId)
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
     * Populate display names from user-service: {@code studentName} and {@code teacherName} on each
     * enrollment (F5), and {@code teacherName} on each nested timetable slot. Uses one bulk lookup
     * per name domain, not per row.
     */
    private List<EnrollmentResponse> enrich(List<EnrollmentResponse> responses) {
        if (responses.isEmpty()) {
            return responses;
        }
        Map<UUID, String> studentNames = userServiceClient.fetchStudentNames();
        Map<UUID, String> teacherNames = userServiceClient.fetchTeacherNames();
        for (EnrollmentResponse r : responses) {
            r.setStudentName(studentNames.get(r.getStudentId()));
            if (r.getTeacherId() != null) {
                r.setTeacherName(teacherNames.get(r.getTeacherId()));
            }
            if (r.getTimetables() != null && !r.getTimetables().isEmpty()) {
                for (var t : r.getTimetables()) {
                    t.setTeacherName(teacherNames.get(t.getTeacherId()));
                }
            }
        }
        return responses;
    }
}
