package com.artacademy.userservice.service;

import com.artacademy.common.events.StudentCreatedEvent;
import com.artacademy.common.events.StudentDeletedEvent;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.events.ParentDeletedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Parent;
import com.artacademy.userservice.domain.Relationship;
import com.artacademy.userservice.domain.Student;
import com.artacademy.userservice.dto.ParentRef;
import com.artacademy.userservice.dto.StudentRequest;
import com.artacademy.userservice.dto.StudentResponse;
import com.artacademy.userservice.dto.StudentSelfUpdateRequest;
import com.artacademy.userservice.mapper.StudentMapper;
import com.artacademy.userservice.repository.ParentRepository;
import com.artacademy.userservice.repository.StudentRepository;
import com.artacademy.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentService {

    /** Default initial auth password when the UI does not supply one. Sourced from config-server. */
    @Value("${artacademy.user.default-temporary-password}")
    private String defaultTemporaryPassword;

    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;
    private final UserRepository userRepository;
    private final StudentMapper studentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final EmailUniquenessValidator emailUniquenessValidator;

    @Transactional(readOnly = true)
    public Page<StudentResponse> getAllStudents(Pageable pageable) {
        return studentRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentByLoginId(String loginId) {
        Student student = studentRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Student not found with login ID: " + loginId));
        return toResponse(student);
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(UUID id) {
        return toResponse(findById(id));
    }

    public StudentResponse updateMyProfile(String loginId, StudentSelfUpdateRequest request) {
        Student student = studentRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Student not found with login ID: " + loginId));
        student.setFirstName(request.getFirstName());
        student.setLastName(request.getLastName());
        emailUniquenessValidator.assertEmailAvailable(request.getEmail(), student.getId());
        student.setEmail(request.getEmail());
        student.setAddress(request.getAddress());
        // Deliberately NOT linking/provisioning parents here: a student self-service edit must not
        // create or mutate parent auth logins. Parent linkage is a principal-managed operation
        // (createStudent / updateStudent).
        return toResponse(studentRepository.save(student));
    }

    public StudentResponse createStudent(StudentRequest request) {
        if (userRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Login ID '" + request.getLoginId() + "' is already taken");
        }
        emailUniquenessValidator.assertEmailAvailable(request.getEmail());

        Student saved = studentRepository.save(studentMapper.toEntity(request));

        linkPrimaryParent(saved, request);
        saved = studentRepository.save(saved);

        List<String> roles = new ArrayList<>(List.of("STUDENT"));
        if (request.getAdditionalRoles() != null) {
            request.getAdditionalRoles().forEach(r -> { if (!roles.contains(r)) roles.add(r); });
        }
        kafkaTemplate.send(KafkaTopics.STUDENT_CREATED, saved.getId().toString(),
                StudentCreatedEvent.builder()
                        .studentId(saved.getId())
                        .username(saved.getLoginId())
                        .email(saved.getEmail())
                        .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                        .firstName(saved.getFirstName())
                        .lastName(saved.getLastName())
                        .roles(roles)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published StudentCreatedEvent for student id={} roles={}", saved.getId(), roles);
        return toResponse(saved);
    }

    public StudentResponse updateStudent(UUID id, StudentRequest request) {
        Student student = findById(id);
        if (request.getLoginId() != null
                && !request.getLoginId().equals(student.getLoginId())
                && userRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Login ID '" + request.getLoginId() + "' is already taken");
        }
        emailUniquenessValidator.assertEmailAvailable(request.getEmail(), student.getId());
        studentMapper.updateEntityFromRequest(request, student);
        linkPrimaryParent(student, request);
        return toResponse(studentRepository.save(student));
    }

    public void deleteStudent(UUID id) {
        Student student = findById(id);
        String loginId = student.getLoginId();
        Set<Parent> affected = new LinkedHashSet<>(student.getParents());

        for (Parent parent : affected) {
            parent.getChildren().remove(student);
            student.getParents().remove(parent);
            parentRepository.save(parent);
        }

        studentRepository.delete(student);
        kafkaTemplate.send(KafkaTopics.STUDENT_DELETED, id.toString(),
                StudentDeletedEvent.builder()
                        .studentId(id)
                        .username(loginId)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Deleted student id={}", id);

        for (Parent parent : affected) {
            if (parent.getChildren().isEmpty()) {
                parentRepository.delete(parent);
                kafkaTemplate.send(KafkaTopics.PARENT_DELETED, parent.getId().toString(),
                        ParentDeletedEvent.builder()
                                .parentId(parent.getId())
                                .username(parent.getLoginId())
                                .occurredAt(Instant.now())
                                .build());
                log.info("Deleted parent id={} loginId={} (no children remaining after student delete)",
                        parent.getId(), parent.getLoginId());
            } else {
                log.info("Kept parent id={} loginId={} ({} child(ren) remaining)",
                        parent.getId(), parent.getLoginId(), parent.getChildren().size());
            }
        }
    }

    /**
     * Create-or-link the student's single parent login. The login parent is the mother when a
     * mother name+phone is supplied, otherwise the father. The parent's loginId IS the phone
     * number, and parents are deduped by phone: if a parent with that phone already exists it is
     * reused (child link added, no new login), so one parent login sees all their children.
     * The other parent's name/phone remain on the Student row and get no login.
     */
    private void linkPrimaryParent(Student student, StudentRequest request) {
        String fatherName = request.getFatherName();
        String fatherPhone = request.getFatherPhone();
        String motherName = request.getMotherName();
        String motherPhone = request.getMotherPhone();
        boolean hasMother = motherName != null && !motherName.isBlank()
                && motherPhone != null && !motherPhone.isBlank();
        boolean hasFather = fatherName != null && !fatherName.isBlank()
                && fatherPhone != null && !fatherPhone.isBlank();

        // The mother gets the login when present, otherwise the father. The other parent is
        // still persisted and linked to the child, but without an auth login.
        if (hasMother) {
            linkOneParent(student, motherName.trim(), motherPhone.trim(),
                    Relationship.MOTHER, true);
        }
        if (hasFather) {
            linkOneParent(student, fatherName.trim(), fatherPhone.trim(),
                    Relationship.FATHER, !hasMother);
        }
    }

    private void linkOneParent(Student student, String name, String phone,
                               Relationship relationship, boolean withLogin) {
        Parent parent = parentRepository.findByPhone(phone).orElse(null);
        if (parent == null) {
            parent = new Parent();
            parent.setLoginId(phone);
            parent.setFirstName(name);
            parent.setParentName(name);
            parent.setPhone(phone);
            parent.setRelationship(relationship);
            parent.setAddress(student.getAddress());
            parent.setStatus("ACTIVE");
            parent.getChildren().add(student);
            parent = parentRepository.save(parent);
            student.getParents().add(parent);

            if (withLogin) {
                kafkaTemplate.send(KafkaTopics.PARENT_CREATED, parent.getId().toString(),
                        ParentCreatedEvent.builder()
                                .parentId(parent.getId())
                                .username(parent.getLoginId())
                                .email(parent.getEmail())
                                .phone(parent.getPhone())
                                .temporaryPassword(defaultTemporaryPassword)
                                .firstName(parent.getFirstName())
                                .lastName(parent.getLastName())
                                .roles(List.of("PARENT"))
                                .occurredAt(Instant.now())
                                .build());
                log.info("Auto-created parent (with login) id={} loginId={} ({}) for student id={}",
                        parent.getId(), parent.getLoginId(), relationship, student.getId());
            } else {
                log.info("Auto-created parent (no login) id={} ({}) for student id={}",
                        parent.getId(), relationship, student.getId());
            }
        } else if (parent.getChildren().add(student)) {
            parentRepository.save(parent);
            student.getParents().add(parent);
            log.info("Linked existing parent id={} (phone={}) to student id={}",
                    parent.getId(), phone, student.getId());
        }
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? defaultTemporaryPassword : requested;
    }

    private Student findById(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Student not found with id: " + id));
    }

    private StudentResponse toResponse(Student student) {
        StudentResponse response = studentMapper.toResponse(student);
        List<ParentRef> parents = student.getParents().stream()
                .map(p -> ParentRef.builder()
                        .id(p.getId())
                        .name(p.getParentName())
                        .relationship(p.getRelationship() == null ? null : p.getRelationship().name())
                        .phone(p.getPhone())
                        .build())
                .toList();
        response.setParents(parents);
        return response;
    }
}
