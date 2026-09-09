package com.artacademy.courseenrollment.service;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.courseenrollment.domain.CourseClass;
import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import com.artacademy.courseenrollment.mapper.EnrollmentMapper;
import com.artacademy.courseenrollment.repository.CourseClassRepository;
import com.artacademy.courseenrollment.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
    private final CourseClassRepository courseClassRepository;
    private final EnrollmentMapper enrollmentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public EnrollmentResponse enrollStudent(EnrollmentRequest request) {
        if (enrollmentRepository.existsByStudentIdAndCourseIdAndStatus(
                request.getStudentId(), request.getCourseId(), STATUS_ACTIVE)) {
            throw ApiException.conflict(
                    "Student id=" + request.getStudentId()
                    + " is already actively enrolled in course id=" + request.getCourseId());
        }

        CourseClass courseClass = courseClassRepository.findById(request.getClassId())
                .orElseThrow(() -> ApiException.notFound("Class not found with id: " + request.getClassId()));

        long enrolledCount = enrollmentRepository.countByClassIdAndStatus(request.getClassId(), STATUS_ACTIVE);
        if (enrolledCount >= courseClass.getCapacity()) {
            throw ApiException.badRequest(
                    "Class id=" + request.getClassId() + " has reached its maximum capacity of "
                    + courseClass.getCapacity());
        }

        Enrollment enrollment = enrollmentMapper.toEntity(request);
        enrollment.setStatus(STATUS_ACTIVE);
        if (enrollment.getEnrollmentDate() == null) {
            enrollment.setEnrollmentDate(LocalDate.now());
        }

        Enrollment saved = enrollmentRepository.save(enrollment);
        log.info("Enrolled student id={} in course id={}, class id={}, enrollment id={}",
                saved.getStudentId(), saved.getCourseId(), saved.getClassId(), saved.getId());

        EnrollmentCreatedEvent event = EnrollmentCreatedEvent.builder()
                .enrollmentId(saved.getId())
                .studentId(saved.getStudentId())
                .courseId(saved.getCourseId())
                .classId(saved.getClassId())
                .occurredAt(Instant.now())
                .build();

        kafkaTemplate.send(KafkaTopics.ENROLLMENT_CREATED, String.valueOf(saved.getId()), event);
        log.info("Published EnrollmentCreatedEvent for enrollment id={}", saved.getId());

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

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getAllEnrollments() {
        return enrollmentRepository.findAll()
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByStudentId(UUID studentId) {
        return enrollmentRepository.findByStudentId(studentId)
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByCourseId(UUID courseId) {
        return enrollmentRepository.findByCourseId(courseId)
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByClassId(UUID classId) {
        return enrollmentRepository.findByClassId(classId)
                .stream()
                .map(enrollmentMapper::toResponse)
                .toList();
    }
}
