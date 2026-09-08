package com.artacademy.auth.consumer;

import com.artacademy.auth.domain.Role;
import com.artacademy.auth.domain.User;
import com.artacademy.auth.repository.RoleRepository;
import com.artacademy.auth.repository.UserRepository;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.events.StudentCreatedEvent;
import com.artacademy.common.events.TeacherCreatedEvent;
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
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserCreatedEventConsumer {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;

    @KafkaListener(topics = KafkaTopics.STUDENT_CREATED, groupId = "auth-service-group")
    @Transactional
    public void onStudentCreated(Map<String, Object> payload) {
        try {
            StudentCreatedEvent event = objectMapper.convertValue(payload, StudentCreatedEvent.class);
            if (userRepository.existsByUsername(event.getUsername())) {
                log.warn("Auth user already exists for username={}, skipping", event.getUsername());
                return;
            }
            List<String> roleNames = (event.getRoles() != null && !event.getRoles().isEmpty())
                    ? event.getRoles() : List.of("STUDENT");
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

    @KafkaListener(topics = KafkaTopics.TEACHER_CREATED, groupId = "auth-service-group")
    @Transactional
    public void onTeacherCreated(Map<String, Object> payload) {
        try {
            TeacherCreatedEvent event = objectMapper.convertValue(payload, TeacherCreatedEvent.class);
            if (userRepository.existsByUsername(event.getUsername())) {
                log.warn("Auth user already exists for username={}, skipping", event.getUsername());
                return;
            }
            List<String> roleNames = (event.getRoles() != null && !event.getRoles().isEmpty())
                    ? event.getRoles() : List.of("TEACHER");
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

    @KafkaListener(topics = KafkaTopics.PARENT_CREATED, groupId = "auth-service-group")
    @Transactional
    public void onParentCreated(Map<String, Object> payload) {
        try {
            ParentCreatedEvent event = objectMapper.convertValue(payload, ParentCreatedEvent.class);
            if (userRepository.existsByUsername(event.getUsername())) {
                log.warn("Auth user already exists for username={}, skipping", event.getUsername());
                return;
            }
            List<String> roleNames = (event.getRoles() != null && !event.getRoles().isEmpty())
                    ? event.getRoles() : List.of("PARENT");
            Set<Role> roles = resolveRoles(roleNames);
            User user = User.builder()
                    .id(event.getParentId())
                    .username(event.getUsername())
                    .email(event.getEmail())
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

    private Set<Role> resolveRoles(List<String> names) {
        return names.stream()
                .map(name -> roleRepository.findByName(name)
                        .orElseThrow(() -> new IllegalStateException("Role not found: " + name)))
                .collect(Collectors.toSet());
    }
}
