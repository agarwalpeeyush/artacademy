package com.artacademy.courseenrollment.user.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.events.ParentDeletedEvent;
import com.artacademy.common.events.PersonRoleChangedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.security.RoleName;
import com.artacademy.courseenrollment.user.domain.Guardianship;
import com.artacademy.courseenrollment.user.domain.ParentProfile;
import com.artacademy.courseenrollment.user.domain.Person;
import com.artacademy.courseenrollment.user.domain.Relationship;
import com.artacademy.courseenrollment.user.dto.ChildRef;
import com.artacademy.courseenrollment.user.dto.ParentRef;
import com.artacademy.courseenrollment.user.dto.ParentRequest;
import com.artacademy.courseenrollment.user.dto.ParentResponse;
import com.artacademy.courseenrollment.user.dto.ParentSelfUpdateRequest;
import com.artacademy.courseenrollment.user.repository.GuardianshipRepository;
import com.artacademy.courseenrollment.user.repository.ParentProfileRepository;
import com.artacademy.courseenrollment.user.repository.PersonRepository;
import com.artacademy.courseenrollment.user.repository.StudentProfileRepository;
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

    private final PersonRepository personRepository;
    private final ParentProfileRepository parentProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final GuardianshipRepository guardianshipRepository;
    private final PersonRoleService personRoleService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public Page<ParentResponse> getAllParents(Pageable pageable) {
        return parentProfileRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ParentResponse getParentById(UUID id) {
        return toResponse(findProfile(id));
    }

    @Transactional(readOnly = true)
    public ParentResponse getParentByPersonId(UUID personId) {
        return toResponse(findProfile(personId));
    }

    @Transactional(readOnly = true)
    public List<ChildRef> getChildrenOf(UUID personId) {
        findProfile(personId);
        return toChildRefs(personId);
    }

    public ParentResponse updateMyProfile(UUID personId, ParentSelfUpdateRequest request) {
        ParentProfile profile = findProfile(personId);
        Person person = profile.getPerson();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setPhoneNumber(request.getPhone());
        profile.setOccupation(request.getOccupation());
        personRepository.save(person);
        return toResponse(parentProfileRepository.save(profile));
    }

    public ParentResponse createParent(ParentRequest request) {
        if (personRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Parent with login ID '" + request.getLoginId() + "' already exists");
        }

        Person person = Person.builder()
                .loginId(request.getLoginId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phoneNumber(request.getPhone())
                .status("ACTIVE")
                .build();
        if (request.getAdditionalRoles() != null) {
            request.getAdditionalRoles().stream()
                    .filter(r -> r.equals(RoleName.PRINCIPAL) || r.equals(RoleName.ADMIN))
                    .forEach(person.getElevatedRoles()::add);
        }
        person = personRepository.save(person);

        parentProfileRepository.save(ParentProfile.builder()
                .person(person)
                .occupation(request.getOccupation())
                .status(request.getStatus())
                .build());

        linkChildren(person.getId(), request.getChildStudentIds(), toRelationship(request.getRelationship()));

        List<String> roles = personRoleService.effectiveRoles(person.getId());
        kafkaTemplate.send(KafkaTopics.PARENT_CREATED, person.getId().toString(),
                ParentCreatedEvent.builder()
                        .parentId(person.getId())
                        .username(person.getLoginId())
                        .email(person.getEmail())
                        .phone(person.getPhoneNumber())
                        .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                        .firstName(person.getFirstName())
                        .lastName(person.getLastName())
                        .roles(roles)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published ParentCreatedEvent for person id={} roles={}", person.getId(), roles);
        return toResponse(findProfile(person.getId()));
    }

    public ParentResponse updateParent(UUID id, ParentRequest request) {
        ParentProfile profile = findProfile(id);
        Person person = profile.getPerson();
        if (request.getLoginId() != null
                && !request.getLoginId().equals(person.getLoginId())
                && personRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Parent with login ID '" + request.getLoginId() + "' already exists");
        }
        if (request.getLoginId() != null) {
            person.setLoginId(request.getLoginId());
        }
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setPhoneNumber(request.getPhone());
        profile.setOccupation(request.getOccupation());
        if (request.getStatus() != null) {
            profile.setStatus(request.getStatus());
        }
        if (request.getChildStudentIds() != null) {
            guardianshipRepository.deleteByGuardianPersonId(id);
            guardianshipRepository.flush();
            linkChildren(id, request.getChildStudentIds(), toRelationship(request.getRelationship()));
        }
        personRepository.save(person);
        return toResponse(parentProfileRepository.save(profile));
    }

    public void deleteParent(UUID id) {
        ParentProfile profile = findProfile(id);
        Person person = profile.getPerson();
        String loginId = person.getLoginId();
        guardianshipRepository.deleteByGuardianPersonId(id);
        parentProfileRepository.delete(profile);
        parentProfileRepository.flush();

        if (personRoleService.holdsNothing(id)) {
            personRepository.delete(person);
            kafkaTemplate.send(KafkaTopics.PARENT_DELETED, id.toString(),
                    ParentDeletedEvent.builder()
                            .parentId(id)
                            .username(loginId)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Deleted person id={} (held no other role after parent delete)", id);
        } else {
            kafkaTemplate.send(KafkaTopics.PERSON_ROLE_CHANGED, id.toString(),
                    PersonRoleChangedEvent.builder()
                            .personId(id)
                            .loginId(loginId)
                            .addedRoles(List.of())
                            .removedRoles(List.of(RoleName.PARENT))
                            .renameUsernameTo(null)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Removed parent profile from person id={}; login retained", id);
        }
    }

    private void linkChildren(UUID guardianId, List<UUID> studentIds, Relationship relationship) {
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }
        for (UUID studentId : studentIds) {
            if (!studentProfileRepository.existsById(studentId)) {
                throw ApiException.notFound("Student not found with id: " + studentId);
            }
            Guardianship.Key key = new Guardianship.Key(guardianId, studentId);
            if (!guardianshipRepository.existsById(key)) {
                guardianshipRepository.save(Guardianship.builder()
                        .guardianPersonId(guardianId)
                        .studentPersonId(studentId)
                        .relationship(relationship)
                        .build());
            }
        }
    }

    private Relationship toRelationship(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Relationship.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Invalid relationship: '" + value + "'");
        }
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? defaultTemporaryPassword : requested;
    }

    private ParentProfile findProfile(UUID personId) {
        return parentProfileRepository.findById(personId)
                .orElseThrow(() -> ApiException.notFound("Parent not found with id: " + personId));
    }

    private ParentResponse toResponse(ParentProfile profile) {
        Person p = profile.getPerson();
        // Relationship on the parent row is derived from the first guardianship edge, if any.
        String relationship = guardianshipRepository.findByGuardianPersonId(p.getId()).stream()
                .map(g -> g.getRelationship() == null ? null : g.getRelationship().name())
                .filter(java.util.Objects::nonNull)
                .findFirst().orElse(null);
        return ParentResponse.builder()
                .id(p.getId())
                .loginId(p.getLoginId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .parentName(fullName(p))
                .relationship(relationship)
                .phone(p.getPhoneNumber())
                .email(p.getEmail())
                .occupation(profile.getOccupation())
                .status(profile.getStatus())
                .children(toChildRefs(p.getId()))
                .otherParents(toOtherParents(p.getId()))
                .build();
    }

    /** Other login-holding guardians (deduped by id) across all this parent's wards. */
    private List<ParentRef> toOtherParents(UUID selfId) {
        Map<UUID, ParentRef> others = new LinkedHashMap<>();
        for (Guardianship own : guardianshipRepository.findByGuardianPersonId(selfId)) {
            for (Guardianship co : guardianshipRepository.findByStudentPersonId(own.getStudentPersonId())) {
                UUID otherId = co.getGuardianPersonId();
                if (!otherId.equals(selfId) && !others.containsKey(otherId)) {
                    personRepository.findById(otherId).ifPresent(op ->
                            others.put(otherId, ParentRef.builder()
                                    .id(op.getId())
                                    .name(fullName(op))
                                    .relationship(co.getRelationship() == null ? null : co.getRelationship().name())
                                    .phone(op.getPhoneNumber())
                                    .build()));
                }
            }
        }
        return new ArrayList<>(others.values());
    }

    private List<ChildRef> toChildRefs(UUID guardianId) {
        List<ChildRef> children = new ArrayList<>();
        for (Guardianship g : guardianshipRepository.findByGuardianPersonId(guardianId)) {
            personRepository.findById(g.getStudentPersonId()).ifPresent(sp ->
                    children.add(ChildRef.builder().id(sp.getId()).name(fullName(sp)).build()));
        }
        return children;
    }

    private String fullName(Person person) {
        String name = (person.getFirstName() == null ? "" : person.getFirstName())
                + (person.getLastName() == null ? "" : " " + person.getLastName());
        return name.trim();
    }
}
