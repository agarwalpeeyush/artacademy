package com.artacademy.userservice.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Parent;
import com.artacademy.userservice.domain.Student;
import com.artacademy.userservice.dto.ParentRequest;
import com.artacademy.userservice.dto.ParentResponse;
import com.artacademy.userservice.mapper.ParentMapper;
import com.artacademy.userservice.repository.ParentRepository;
import com.artacademy.userservice.repository.StudentRepository;
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
public class ParentService {

    /** Default initial auth password when the UI does not supply one. LOCAL/TESTING default — rotate before production. */
    private static final String DEFAULT_TEMPORARY_PASSWORD = "Welcome@123";

    private final ParentRepository parentRepository;
    private final StudentRepository studentRepository;
    private final ParentMapper parentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public Page<ParentResponse> getAllParents(Pageable pageable) {
        return parentRepository.findAll(pageable).map(this::toEnrichedResponse);
    }

    @Transactional(readOnly = true)
    public ParentResponse getParentById(UUID id) {
        return toEnrichedResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public ParentResponse getParentByLoginId(String loginId) {
        Parent parent = parentRepository.findAllByLoginId(loginId).stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Parent not found with login ID: " + loginId));
        return toEnrichedResponse(parent);
    }

    @Transactional(readOnly = true)
    public List<ParentResponse> getMyChildren(String loginId) {
        return parentRepository.findAllByLoginId(loginId).stream()
                .map(this::toEnrichedResponse)
                .toList();
    }

    public ParentResponse createParent(ParentRequest request) {
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> ApiException.notFound("Student not found with id: " + request.getStudentId()));

        boolean firstAccount = !parentRepository.existsByLoginId(request.getLoginId());
        Parent saved = parentRepository.save(parentMapper.toEntity(request));

        if (firstAccount) {
            List<String> roles = new ArrayList<>(List.of("PARENT"));
            if (request.getAdditionalRoles() != null) {
                request.getAdditionalRoles().forEach(r -> { if (!roles.contains(r)) roles.add(r); });
            }
            kafkaTemplate.send(KafkaTopics.PARENT_CREATED, saved.getId().toString(),
                    ParentCreatedEvent.builder()
                            .parentId(saved.getId())
                            .username(saved.getLoginId())
                            .email(saved.getEmail())
                            .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                            .firstName(saved.getFirstName())
                            .lastName(saved.getLastName())
                            .roles(roles)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Published ParentCreatedEvent for parent id={} roles={}", saved.getId(), roles);
        } else {
            log.info("Added child link for existing parent loginId={} parentRowId={}",
                    saved.getLoginId(), saved.getId());
        }

        return toEnrichedResponse(saved, student);
    }

    public ParentResponse updateParent(UUID id, ParentRequest request) {
        Parent parent = findById(id);
        if (request.getLoginId() != null
                && !request.getLoginId().equals(parent.getLoginId())
                && parentRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Parent with login ID '" + request.getLoginId() + "' already exists");
        }
        parentMapper.updateEntityFromRequest(request, parent);
        return toEnrichedResponse(parentRepository.save(parent));
    }

    public void deleteParent(UUID id) {
        parentRepository.delete(findById(id));
        log.info("Deleted parent id={}", id);
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? DEFAULT_TEMPORARY_PASSWORD : requested;
    }

    private Parent findById(UUID id) {
        return parentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Parent not found with id: " + id));
    }

    private ParentResponse toEnrichedResponse(Parent parent) {
        Student student = parent.getStudentId() == null ? null
                : studentRepository.findById(parent.getStudentId()).orElse(null);
        return toEnrichedResponse(parent, student);
    }

    private ParentResponse toEnrichedResponse(Parent parent, Student student) {
        ParentResponse response = parentMapper.toResponse(parent);
        if (student != null) {
            String name = (student.getFirstName() == null ? "" : student.getFirstName())
                    + (student.getLastName() == null ? "" : " " + student.getLastName());
            response.setStudentName(name.trim());
        }
        return response;
    }
}
