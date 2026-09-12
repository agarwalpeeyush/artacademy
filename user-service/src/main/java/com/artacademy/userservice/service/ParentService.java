package com.artacademy.userservice.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.events.ParentDeletedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Parent;
import com.artacademy.userservice.domain.Student;
import com.artacademy.userservice.dto.ChildRef;
import com.artacademy.userservice.dto.ParentRef;
import com.artacademy.userservice.dto.ParentRequest;
import com.artacademy.userservice.dto.ParentResponse;
import com.artacademy.userservice.dto.ParentSelfUpdateRequest;
import com.artacademy.userservice.mapper.ParentMapper;
import com.artacademy.userservice.repository.ParentRepository;
import com.artacademy.userservice.repository.StudentRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ParentService {

    /** Default initial auth password when the UI does not supply one. Sourced from config-server. */
    @Value("${artacademy.user.default-temporary-password}")
    private String defaultTemporaryPassword;

    private final ParentRepository parentRepository;
    private final StudentRepository studentRepository;
    private final ParentMapper parentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final EmailUniquenessValidator emailUniquenessValidator;

    @Transactional(readOnly = true)
    public Page<ParentResponse> getAllParents(Pageable pageable) {
        return parentRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ParentResponse getParentById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public ParentResponse getParentByLoginId(String loginId) {
        Parent parent = parentRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Parent not found with login ID: " + loginId));
        return toResponse(parent);
    }

    @Transactional(readOnly = true)
    public List<ChildRef> getMyChildren(String loginId) {
        Parent parent = parentRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Parent not found with login ID: " + loginId));
        return toChildRefs(parent);
    }

    public ParentResponse updateMyProfile(String loginId, ParentSelfUpdateRequest request) {
        Parent parent = parentRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Parent not found with login ID: " + loginId));
        parent.setFirstName(request.getFirstName());
        parent.setLastName(request.getLastName());
        emailUniquenessValidator.assertEmailAvailable(request.getEmail(), parent.getId());
        parent.setEmail(request.getEmail());
        parent.setPhone(request.getPhone());
        parent.setAddress(request.getAddress());
        parent.setOccupation(request.getOccupation());
        parent.setRelationship(parentMapper.toRelationship(request.getRelationship()));
        return toResponse(parentRepository.save(parent));
    }

    public ParentResponse createParent(ParentRequest request) {
        if (parentRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Parent with login ID '" + request.getLoginId() + "' already exists");
        }
        emailUniquenessValidator.assertEmailAvailable(request.getEmail());

        Parent parent = parentMapper.toEntity(request);
        parent.getChildren().addAll(resolveChildren(request.getChildStudentIds()));
        Parent saved = parentRepository.save(parent);

        List<String> roles = new ArrayList<>(List.of("PARENT"));
        if (request.getAdditionalRoles() != null) {
            request.getAdditionalRoles().forEach(r -> { if (!roles.contains(r)) roles.add(r); });
        }
        kafkaTemplate.send(KafkaTopics.PARENT_CREATED, saved.getId().toString(),
                ParentCreatedEvent.builder()
                        .parentId(saved.getId())
                        .username(saved.getLoginId())
                        .email(saved.getEmail())
                        .phone(saved.getPhone())
                        .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                        .firstName(saved.getFirstName())
                        .lastName(saved.getLastName())
                        .roles(roles)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published ParentCreatedEvent for parent id={} roles={}", saved.getId(), roles);
        return toResponse(saved);
    }

    public ParentResponse updateParent(UUID id, ParentRequest request) {
        Parent parent = findById(id);
        if (request.getLoginId() != null
                && !request.getLoginId().equals(parent.getLoginId())
                && parentRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Parent with login ID '" + request.getLoginId() + "' already exists");
        }
        emailUniquenessValidator.assertEmailAvailable(request.getEmail(), parent.getId());
        parentMapper.updateEntityFromRequest(request, parent);
        if (request.getChildStudentIds() != null) {
            parent.getChildren().clear();
            parent.getChildren().addAll(resolveChildren(request.getChildStudentIds()));
        }
        return toResponse(parentRepository.save(parent));
    }

    public void deleteParent(UUID id) {
        Parent parent = findById(id);
        String loginId = parent.getLoginId();
        parentRepository.delete(parent);
        kafkaTemplate.send(KafkaTopics.PARENT_DELETED, id.toString(),
                ParentDeletedEvent.builder()
                        .parentId(id)
                        .username(loginId)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Deleted parent id={}", id);
    }

    private List<Student> resolveChildren(List<UUID> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return List.of();
        }
        return studentIds.stream()
                .map(sid -> studentRepository.findById(sid)
                        .orElseThrow(() -> ApiException.notFound("Student not found with id: " + sid)))
                .toList();
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? defaultTemporaryPassword : requested;
    }

    private Parent findById(UUID id) {
        return parentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Parent not found with id: " + id));
    }

    private ParentResponse toResponse(Parent parent) {
        ParentResponse response = parentMapper.toResponse(parent);
        response.setChildren(toChildRefs(parent));
        response.setOtherParents(toOtherParents(parent));
        return response;
    }

    /** Collect the other parents (deduped by id) across all of this parent's children. */
    private List<ParentRef> toOtherParents(Parent self) {
        Map<UUID, ParentRef> others = new LinkedHashMap<>();
        for (Student child : self.getChildren()) {
            for (Parent p : child.getParents()) {
                if (!p.getId().equals(self.getId())) {
                    others.putIfAbsent(p.getId(), toParentRef(p));
                }
            }
        }
        return new ArrayList<>(others.values());
    }

    private ParentRef toParentRef(Parent parent) {
        return ParentRef.builder()
                .id(parent.getId())
                .name(parent.getParentName())
                .relationship(parent.getRelationship() == null ? null : parent.getRelationship().name())
                .phone(parent.getPhone())
                .build();
    }

    private List<ChildRef> toChildRefs(Parent parent) {
        return parent.getChildren().stream()
                .map(s -> ChildRef.builder()
                        .id(s.getId())
                        .name(fullName(s))
                        .build())
                .toList();
    }

    private String fullName(Student student) {
        String name = (student.getFirstName() == null ? "" : student.getFirstName())
                + (student.getLastName() == null ? "" : " " + student.getLastName());
        return name.trim();
    }
}
