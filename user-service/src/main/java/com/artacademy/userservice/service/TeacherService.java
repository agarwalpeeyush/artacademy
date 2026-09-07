package com.artacademy.userservice.service;

import com.artacademy.common.events.TeacherCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Teacher;
import com.artacademy.userservice.domain.TeacherAvailability;
import com.artacademy.userservice.dto.TeacherAvailabilityRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityResponse;
import com.artacademy.userservice.dto.TeacherRequest;
import com.artacademy.userservice.dto.TeacherResponse;
import com.artacademy.userservice.mapper.TeacherMapper;
import com.artacademy.userservice.repository.TeacherAvailabilityRepository;
import com.artacademy.userservice.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final TeacherAvailabilityRepository availabilityRepository;
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

    public TeacherResponse createTeacher(TeacherRequest request) {
        if (teacherRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw ApiException.conflict("Teacher with employee code '" + request.getEmployeeCode() + "' already exists");
        }
        Teacher saved = teacherRepository.save(teacherMapper.toEntity(request));
        kafkaTemplate.send(KafkaTopics.TEACHER_CREATED, saved.getId().toString(),
                TeacherCreatedEvent.builder()
                        .teacherId(saved.getId())
                        .employeeCode(saved.getEmployeeCode())
                        .firstName(saved.getFirstName())
                        .lastName(saved.getLastName())
                        .email(saved.getEmail())
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published TeacherCreatedEvent for teacher id={}", saved.getId());
        return teacherMapper.toResponse(saved);
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
        availabilityRepository.deleteByTeacherId(teacher.getId());
        teacherRepository.delete(teacher);
        log.info("Deleted teacher id={}", id);
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

    private Teacher findById(UUID id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Teacher not found with id: " + id));
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
