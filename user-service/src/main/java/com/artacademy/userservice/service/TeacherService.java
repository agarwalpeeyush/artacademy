package com.artacademy.userservice.service;

import com.artacademy.common.events.TeacherCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Teacher;
import com.artacademy.userservice.domain.TeacherAvailability;
import com.artacademy.userservice.domain.TeacherAvailabilityException;
import com.artacademy.userservice.dto.TeacherAvailabilityExceptionRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityExceptionResponse;
import com.artacademy.userservice.dto.TeacherAvailabilityRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityResponse;
import com.artacademy.userservice.dto.TeacherRequest;
import com.artacademy.userservice.dto.TeacherResponse;
import com.artacademy.userservice.dto.TeacherSelfUpdateRequest;
import com.artacademy.userservice.mapper.TeacherMapper;
import com.artacademy.userservice.repository.TeacherAvailabilityExceptionRepository;
import com.artacademy.userservice.repository.TeacherAvailabilityRepository;
import com.artacademy.userservice.repository.TeacherRepository;
import com.artacademy.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeacherService {

    /** Default initial auth password when the UI does not supply one. LOCAL/TESTING default — rotate before production. */
    private static final String DEFAULT_TEMPORARY_PASSWORD = "Welcome@123";

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final TeacherAvailabilityRepository availabilityRepository;
    private final TeacherAvailabilityExceptionRepository availabilityExceptionRepository;
    private final TeacherMapper teacherMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public Page<TeacherResponse> getAllTeachers(Pageable pageable) {
        return teacherRepository.findAll(pageable).map(teacherMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public TeacherResponse getTeacherById(UUID id) {
        return teacherMapper.toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public TeacherResponse getTeacherByLoginId(String loginId) {
        Teacher teacher = teacherRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found with login ID: " + loginId));
        return teacherMapper.toResponse(teacher);
    }

    public TeacherResponse updateMyProfile(String loginId, TeacherSelfUpdateRequest request) {
        Teacher teacher = teacherRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found with login ID: " + loginId));
        teacher.setFirstName(request.getFirstName());
        teacher.setLastName(request.getLastName());
        teacher.setEmail(request.getEmail());
        teacher.setPhone(request.getPhone());
        teacher.setQualification(request.getQualification());
        return teacherMapper.toResponse(teacherRepository.save(teacher));
    }

    public TeacherResponse createTeacher(TeacherRequest request) {
        if (request.getLoginId() != null && userRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Login ID '" + request.getLoginId() + "' is already taken");
        }
        if (teacherRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw ApiException.conflict("Teacher with employee code '" + request.getEmployeeCode() + "' already exists");
        }
        Teacher saved = teacherRepository.save(teacherMapper.toEntity(request));
        List<String> roles = new ArrayList<>(List.of("TEACHER"));
        if (request.getAdditionalRoles() != null) {
            request.getAdditionalRoles().forEach(r -> { if (!roles.contains(r)) roles.add(r); });
        }
        kafkaTemplate.send(KafkaTopics.TEACHER_CREATED, saved.getId().toString(),
                TeacherCreatedEvent.builder()
                        .teacherId(saved.getId())
                        .username(saved.getLoginId())
                        .email(saved.getEmail())
                        .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                        .employeeCode(saved.getEmployeeCode())
                        .firstName(saved.getFirstName())
                        .lastName(saved.getLastName())
                        .roles(roles)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published TeacherCreatedEvent for teacher id={} roles={}", saved.getId(), roles);
        return teacherMapper.toResponse(saved);
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? DEFAULT_TEMPORARY_PASSWORD : requested;
    }

    public TeacherResponse updateTeacher(UUID id, TeacherRequest request) {
        Teacher teacher = findById(id);
        if (!teacher.getEmployeeCode().equals(request.getEmployeeCode())
                && teacherRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw ApiException.conflict("Teacher with employee code '" + request.getEmployeeCode() + "' already exists");
        }
        teacherMapper.updateEntityFromRequest(request, teacher);
        return teacherMapper.toResponse(teacherRepository.save(teacher));
    }

    public void deleteTeacher(UUID id) {
        Teacher teacher = findById(id);
        availabilityExceptionRepository.deleteByTeacherId(teacher.getId());
        availabilityRepository.deleteByTeacherId(teacher.getId());
        teacherRepository.delete(teacher);        log.info("Deleted teacher id={}", id);
    }

    @Transactional(readOnly = true)
    public List<TeacherAvailabilityResponse> getAvailability(UUID teacherId) {
        findById(teacherId);
        return availabilityRepository.findByTeacherId(teacherId).stream()
                .map(this::toAvailabilityResponse).toList();
    }

    public List<TeacherAvailabilityResponse> updateAvailability(UUID teacherId, List<TeacherAvailabilityRequest> requests) {
        Teacher teacher = findById(teacherId);
        availabilityRepository.deleteByTeacherId(teacherId);
        List<TeacherAvailability> slots = requests.stream()
                .map(r -> TeacherAvailability.builder()
                        .teacher(teacher)
                        .dayOfWeek(r.getDayOfWeek())
                        .startTime(r.getStartTime())
                        .endTime(r.getEndTime())
                        .build())
                .toList();
        return availabilityRepository.saveAll(slots).stream().map(this::toAvailabilityResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TeacherAvailabilityExceptionResponse> getExceptions(UUID teacherId) {
        findById(teacherId);
        return availabilityExceptionRepository.findByTeacherIdOrderByDateDesc(teacherId).stream()
                .map(this::toExceptionResponse).toList();
    }

    public TeacherAvailabilityExceptionResponse addException(UUID teacherId, TeacherAvailabilityExceptionRequest request) {
        Teacher teacher = findById(teacherId);
        TeacherAvailabilityException exception = TeacherAvailabilityException.builder()
                .teacher(teacher)
                .date(request.getDate())
                .reason(request.getReason())
                .unavailableAllDay(request.isUnavailableAllDay())
                .startTime(request.isUnavailableAllDay() ? null : request.getStartTime())
                .endTime(request.isUnavailableAllDay() ? null : request.getEndTime())
                .build();
        return toExceptionResponse(availabilityExceptionRepository.save(exception));
    }

    public void deleteException(UUID teacherId, UUID exceptionId) {
        TeacherAvailabilityException exception = availabilityExceptionRepository.findById(exceptionId)
                .orElseThrow(() -> ApiException.notFound("Availability exception not found with id: " + exceptionId));
        if (!exception.getTeacher().getId().equals(teacherId)) {
            throw ApiException.notFound("Availability exception not found for teacher id: " + teacherId);
        }
        availabilityExceptionRepository.delete(exception);
    }

    private Teacher findById(UUID id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Teacher not found with id: " + id));
    }

    private TeacherAvailabilityExceptionResponse toExceptionResponse(TeacherAvailabilityException e) {
        return TeacherAvailabilityExceptionResponse.builder()
                .id(e.getId())
                .teacherId(e.getTeacher().getId())
                .date(e.getDate())
                .reason(e.getReason())
                .unavailableAllDay(e.isUnavailableAllDay())
                .startTime(e.getStartTime())
                .endTime(e.getEndTime())
                .build();
    }

    private TeacherAvailabilityResponse toAvailabilityResponse(TeacherAvailability a) {
        return TeacherAvailabilityResponse.builder()
                .id(a.getId())
                .teacherId(a.getTeacher().getId())
                .dayOfWeek(a.getDayOfWeek())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .build();
    }
}
