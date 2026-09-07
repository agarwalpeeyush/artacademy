package com.artacademy.userservice.service;

import com.artacademy.common.events.StudentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Student;
import com.artacademy.userservice.dto.StudentRequest;
import com.artacademy.userservice.dto.StudentResponse;
import com.artacademy.userservice.mapper.StudentMapper;
import com.artacademy.userservice.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public Page<StudentResponse> getAllStudents(Pageable pageable) {
        return studentRepository.findAll(pageable).map(studentMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentByLoginId(String loginId) {
        Student student = studentRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Student not found with login ID: " + loginId));
        return studentMapper.toResponse(student);
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(UUID id) {
        return studentMapper.toResponse(findById(id));
    }

    public StudentResponse createStudent(StudentRequest request) {
        if (request.getLoginId() != null && studentRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Student with login ID '" + request.getLoginId() + "' already exists");
        }
        Student saved = studentRepository.save(studentMapper.toEntity(request));
        kafkaTemplate.send(KafkaTopics.STUDENT_CREATED, saved.getId().toString(),
                StudentCreatedEvent.builder()
                        .studentId(saved.getId())
                        .firstName(saved.getFirstName())
                        .lastName(saved.getLastName())
                        .email(saved.getEmail())
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published StudentCreatedEvent for student id={}", saved.getId());
        return studentMapper.toResponse(saved);
    }

    public StudentResponse updateStudent(UUID id, StudentRequest request) {
        Student student = findById(id);
        if (request.getLoginId() != null
                && !request.getLoginId().equals(student.getLoginId())
                && studentRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Student with login ID '" + request.getLoginId() + "' already exists");
        }
        studentMapper.updateEntityFromRequest(request, student);
        return studentMapper.toResponse(studentRepository.save(student));
    }

    public void deleteStudent(UUID id) {
        studentRepository.delete(findById(id));
        log.info("Deleted student id={}", id);
    }

    private Student findById(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Student not found with id: " + id));
    }
}
