package com.artacademy.auth.consumer;

import com.artacademy.auth.domain.Role;
import com.artacademy.auth.domain.User;
import com.artacademy.auth.repository.ReservedUsernameRepository;
import com.artacademy.auth.repository.RoleRepository;
import com.artacademy.auth.repository.UserRepository;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.events.ParentDeletedEvent;
import com.artacademy.common.events.PersonRoleChangedEvent;
import com.artacademy.common.events.StudentCreatedEvent;
import com.artacademy.common.events.StudentDeletedEvent;
import com.artacademy.common.events.TeacherCreatedEvent;
import com.artacademy.common.events.TeacherDeletedEvent;
import com.artacademy.common.security.RoleName;
import com.artacademy.auth.domain.ReservedUsername;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserCreatedEventConsumer {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ReservedUsernameRepository reservedUsernameRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;

    @KafkaListener(topics = KafkaTopics.STUDENT_CREATED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onStudentCreated(Map<String, Object> payload) {
        try {
            StudentCreatedEvent event = objectMapper.convertValue(payload, StudentCreatedEvent.class);
            requireIdentity(event.getStudentId(), event.getUsername(), "StudentCreatedEvent");
            if (isReserved(event.getUsername())) {
                log.warn("Username {} is reserved (tombstoned), skipping StudentCreatedEvent", event.getUsername());
                return;
            }
            if (userRepository.existsByUsername(event.getUsername())) {
                log.warn("Auth user already exists for username={}, skipping", event.getUsername());
                return;
            }
            if (event.getEmail() != null && userRepository.existsByEmail(event.getEmail())) {
                log.warn("Auth user email={} already in use, skipping StudentCreatedEvent for username={}",
                        event.getEmail(), event.getUsername());
                return;
            }
            List<String> roleNames = (event.getRoles() != null && !event.getRoles().isEmpty())
                    ? event.getRoles() : List.of(RoleName.STUDENT);
            Set<Role> roles = resolveRoles(roleNames);
            User user = User.builder()
                    .id(event.getStudentId())
                    .username(event.getUsername())
                    .email(event.getEmail())
                    .password(passwordEncoder.encode(event.getTemporaryPassword()))
                    .status("ACTIVE")
                    .roles(roles)
                    .build();
            entityManager.persist(user);
            log.info("Created auth user for student id={} username={} roles={}", event.getStudentId(), event.getUsername(), roleNames);
        } catch (Exception e) {
            log.error("Failed to process StudentCreatedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(topics = KafkaTopics.TEACHER_CREATED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onTeacherCreated(Map<String, Object> payload) {
        try {
            TeacherCreatedEvent event = objectMapper.convertValue(payload, TeacherCreatedEvent.class);
            requireIdentity(event.getTeacherId(), event.getUsername(), "TeacherCreatedEvent");
            if (isReserved(event.getUsername())) {
                log.warn("Username {} is reserved (tombstoned), skipping TeacherCreatedEvent", event.getUsername());
                return;
            }
            if (userRepository.existsByUsername(event.getUsername())) {
                log.warn("Auth user already exists for username={}, skipping", event.getUsername());
                return;
            }
            if (event.getEmail() != null && userRepository.existsByEmail(event.getEmail())) {
                log.warn("Auth user email={} already in use, skipping TeacherCreatedEvent for username={}",
                        event.getEmail(), event.getUsername());
                return;
            }
            List<String> roleNames = (event.getRoles() != null && !event.getRoles().isEmpty())
                    ? event.getRoles() : List.of(RoleName.TEACHER);
            Set<Role> roles = resolveRoles(roleNames);
            User user = User.builder()
                    .id(event.getTeacherId())
                    .username(event.getUsername())
                    .email(event.getEmail())
                    .password(passwordEncoder.encode(event.getTemporaryPassword()))
                    .status("ACTIVE")
                    .roles(roles)
                    .build();
            entityManager.persist(user);
            log.info("Created auth user for teacher id={} username={} roles={}", event.getTeacherId(), event.getUsername(), roleNames);
        } catch (Exception e) {
            log.error("Failed to process TeacherCreatedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(topics = KafkaTopics.PARENT_CREATED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onParentCreated(Map<String, Object> payload) {
        try {
            ParentCreatedEvent event = objectMapper.convertValue(payload, ParentCreatedEvent.class);
            requireIdentity(event.getParentId(), event.getUsername(), "ParentCreatedEvent");
            if (isReserved(event.getUsername())) {
                log.warn("Username {} is reserved (tombstoned), skipping ParentCreatedEvent", event.getUsername());
                return;
            }
            if (userRepository.existsByUsername(event.getUsername())) {
                log.warn("Auth user already exists for username={}, skipping", event.getUsername());
                return;
            }
            if (event.getEmail() != null && userRepository.existsByEmail(event.getEmail())) {
                log.warn("Auth user email={} already in use, skipping ParentCreatedEvent for username={}",
                        event.getEmail(), event.getUsername());
                return;
            }
            List<String> roleNames = (event.getRoles() != null && !event.getRoles().isEmpty())
                    ? event.getRoles() : List.of(RoleName.PARENT);
            Set<Role> roles = resolveRoles(roleNames);
            User user = User.builder()
                    .id(event.getParentId())
                    .username(event.getUsername())
                    .email(event.getEmail())
                    .phone(event.getPhone())
                    .password(passwordEncoder.encode(event.getTemporaryPassword()))
                    .status("ACTIVE")
                    .roles(roles)
                    .build();
            entityManager.persist(user);
            log.info("Created auth user for parent id={} username={} roles={}", event.getParentId(), event.getUsername(), roleNames);
        } catch (Exception e) {
            log.error("Failed to process ParentCreatedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(topics = KafkaTopics.PARENT_DELETED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onParentDeleted(Map<String, Object> payload) {
        try {
            ParentDeletedEvent event = objectMapper.convertValue(payload, ParentDeletedEvent.class);
            if (userRepository.existsById(event.getParentId())) {
                userRepository.deleteById(event.getParentId());
                log.info("Deleted auth user for parent id={} username={}", event.getParentId(), event.getUsername());
            } else {
                log.warn("No auth user found for parent id={} username={}, skipping delete",
                        event.getParentId(), event.getUsername());
            }
        } catch (Exception e) {
            log.error("Failed to process ParentDeletedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(topics = KafkaTopics.STUDENT_DELETED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onStudentDeleted(Map<String, Object> payload) {
        try {
            StudentDeletedEvent event = objectMapper.convertValue(payload, StudentDeletedEvent.class);
            if (userRepository.existsById(event.getStudentId())) {
                userRepository.deleteById(event.getStudentId());
                log.info("Deleted auth user for student id={} username={}", event.getStudentId(), event.getUsername());
            } else {
                log.warn("No auth user found for student id={} username={}, skipping delete",
                        event.getStudentId(), event.getUsername());
            }
        } catch (Exception e) {
            log.error("Failed to process StudentDeletedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(topics = KafkaTopics.TEACHER_DELETED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onTeacherDeleted(Map<String, Object> payload) {
        try {
            TeacherDeletedEvent event = objectMapper.convertValue(payload, TeacherDeletedEvent.class);
            if (userRepository.existsById(event.getTeacherId())) {
                userRepository.deleteById(event.getTeacherId());
                log.info("Deleted auth user for teacher id={} username={}", event.getTeacherId(), event.getUsername());
            } else {
                log.warn("No auth user found for teacher id={} username={}, skipping delete",
                        event.getTeacherId(), event.getUsername());
            }
        } catch (Exception e) {
            log.error("Failed to process TeacherDeletedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Role/username change on an EXISTING login (OQ5). Idempotent and keyed on personId, which equals
    // the auth User.id (the *CreatedEvents mint the login with id = person/teacher/student id). Appends
    // addedRoles, removes removedRoles, and — if renameUsernameTo is set — promotes the username and
    // tombstones the old one (D3/D9). No temp password: the login already exists.
    @KafkaListener(topics = KafkaTopics.PERSON_ROLE_CHANGED, groupId = "auth-service-group",
            containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void onPersonRoleChanged(Map<String, Object> payload) {
        try {
            PersonRoleChangedEvent event = objectMapper.convertValue(payload, PersonRoleChangedEvent.class);
            if (event.getPersonId() == null) {
                throw new IllegalArgumentException("PersonRoleChangedEvent missing personId");
            }
            User user = userRepository.findById(event.getPersonId()).orElse(null);
            if (user == null) {
                // No login yet for this person (e.g. a student with no auth account). Nothing to change.
                log.warn("No auth user for personId={}, skipping PersonRoleChangedEvent", event.getPersonId());
                return;
            }

            boolean changed = false;

            List<String> added = event.getAddedRoles();
            if (added != null && !added.isEmpty()) {
                for (Role role : resolveRoles(added)) {
                    if (user.getRoles().add(role)) {
                        changed = true;
                    }
                }
            }

            List<String> removed = event.getRemovedRoles();
            if (removed != null && !removed.isEmpty()) {
                Set<String> toRemove = Set.copyOf(removed);
                changed |= user.getRoles().removeIf(r -> toRemove.contains(r.getName()));
            }

            String renameTo = event.getRenameUsernameTo();
            if (renameTo != null && !renameTo.isBlank() && !renameTo.equals(user.getUsername())) {
                String oldUsername = user.getUsername();
                user.setUsername(renameTo);
                reserve(oldUsername, user.getId());
                changed = true;
                log.info("Promoted username personId={} {} -> {} (old tombstoned)",
                        user.getId(), oldUsername, renameTo);
            }

            if (changed) {
                user.setUpdatedAt(java.time.Instant.now());
                entityManager.merge(user);
                log.info("Applied PersonRoleChangedEvent personId={} added={} removed={} rename={}",
                        event.getPersonId(), added, removed, renameTo);
            } else {
                log.info("PersonRoleChangedEvent personId={} was a no-op (already applied)", event.getPersonId());
            }
        } catch (Exception e) {
            log.error("Failed to process PersonRoleChangedEvent: {}", e.getMessage(), e);
            throw e;
        }
    }

    private boolean isReserved(String username) {
        return username != null && reservedUsernameRepository.existsByUsername(username);
    }

    private void reserve(String username, UUID personId) {
        if (username == null || username.isBlank() || reservedUsernameRepository.existsByUsername(username)) {
            return;
        }
        entityManager.persist(ReservedUsername.builder()
                .username(username)
                .personId(personId)
                .build());
    }

    private Set<Role> resolveRoles(List<String> names) {
        return names.stream()
                .map(name -> roleRepository.findByName(name)
                        .orElseThrow(() -> new IllegalStateException("Role not found: " + name)))
                .collect(Collectors.toSet());
    }

    /**
     * A malformed *CreatedEvent (missing id or username) can never produce a valid auth login and
     * would only fail deeper in persistence. Reject it up front so it lands in the DLQ with a clear
     * cause instead of a confusing constraint-violation stack trace.
     */
    private void requireIdentity(UUID id, String username, String eventType) {
        if (id == null || username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    eventType + " missing required identity (id=" + id + ", username=" + username + ")");
        }
    }
}
