package com.artacademy.courseenrollment.user.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ParentCreatedEvent;
import com.artacademy.common.events.PersonRoleChangedEvent;
import com.artacademy.common.events.StudentCreatedEvent;
import com.artacademy.common.events.StudentDeletedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.security.RoleName;
import com.artacademy.courseenrollment.user.domain.Guardianship;
import com.artacademy.courseenrollment.user.domain.ParentProfile;
import com.artacademy.courseenrollment.user.domain.Person;
import com.artacademy.courseenrollment.user.domain.Relationship;
import com.artacademy.courseenrollment.user.domain.StudentProfile;
import com.artacademy.courseenrollment.user.dto.ParentRef;
import com.artacademy.courseenrollment.user.dto.StudentRequest;
import com.artacademy.courseenrollment.user.dto.StudentResponse;
import com.artacademy.courseenrollment.user.dto.StudentSelfUpdateRequest;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentService {

    /** Default initial auth password when the UI does not supply one. Sourced from config-server. */
    @Value("${artacademy.user.default-temporary-password}")
    private String defaultTemporaryPassword;

    private final PersonRepository personRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ParentProfileRepository parentProfileRepository;
    private final GuardianshipRepository guardianshipRepository;
    private final PersonRoleService personRoleService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public Page<StudentResponse> getAllStudents(Pageable pageable) {
        return studentProfileRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentByPersonId(UUID personId) {
        return toResponse(findProfile(personId));
    }

    /** Bulk personId -> display name map for in-process name enrichment by the enrollment domain. */
    @Transactional(readOnly = true)
    public java.util.Map<UUID, String> fetchStudentNames() {
        java.util.Map<UUID, String> names = new java.util.HashMap<>();
        for (StudentProfile profile : studentProfileRepository.findAll()) {
            Person person = profile.getPerson();
            if (person == null) {
                continue;
            }
            String full = ((person.getFirstName() == null ? "" : person.getFirstName()) + " "
                    + (person.getLastName() == null ? "" : person.getLastName())).trim();
            if (!full.isEmpty()) {
                names.put(profile.getPersonId(), full);
            }
        }
        return names;
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(UUID id) {
        return toResponse(findProfile(id));
    }

    public StudentResponse updateMyProfile(UUID personId, StudentSelfUpdateRequest request) {
        StudentProfile profile = findProfile(personId);
        Person person = profile.getPerson();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        profile.setAddress(request.getAddress());
        // Deliberately NOT linking/provisioning parents here: a student self-service edit must not
        // create or mutate parent auth logins. Parent linkage is a principal/teacher-managed operation.
        personRepository.save(person);
        return toResponse(studentProfileRepository.save(profile));
    }

    public StudentResponse createStudent(StudentRequest request) {
        if (personRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Login ID '" + request.getLoginId() + "' is already taken");
        }

        Person studentPerson = Person.builder()
                .loginId(request.getLoginId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .status("ACTIVE")
                .build();
        studentPerson = personRepository.save(studentPerson);

        StudentProfile profile = StudentProfile.builder()
                .person(studentPerson)
                .dob(request.getDob())
                .address(request.getAddress())
                .schoolName(request.getSchoolName())
                .className(request.getClassName())
                .enrollmentDate(request.getEnrollmentDate())
                .status(request.getStatus())
                .build();

        linkGuardians(studentPerson, profile, request);
        profile = studentProfileRepository.save(profile);

        List<String> roles = new ArrayList<>(List.of(RoleName.STUDENT));
        if (request.getAdditionalRoles() != null) {
            request.getAdditionalRoles().forEach(r -> { if (!roles.contains(r)) roles.add(r); });
        }
        kafkaTemplate.send(KafkaTopics.STUDENT_CREATED, studentPerson.getId().toString(),
                StudentCreatedEvent.builder()
                        .studentId(studentPerson.getId())
                        .username(studentPerson.getLoginId())
                        .email(studentPerson.getEmail())
                        .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                        .firstName(studentPerson.getFirstName())
                        .lastName(studentPerson.getLastName())
                        .roles(roles)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published StudentCreatedEvent for person id={} roles={}", studentPerson.getId(), roles);
        return toResponse(profile);
    }

    public StudentResponse updateStudent(UUID id, StudentRequest request) {
        StudentProfile profile = findProfile(id);
        Person person = profile.getPerson();
        if (request.getLoginId() != null
                && !request.getLoginId().equals(person.getLoginId())
                && personRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Login ID '" + request.getLoginId() + "' is already taken");
        }
        if (request.getLoginId() != null) {
            person.setLoginId(request.getLoginId());
        }
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        profile.setDob(request.getDob());
        profile.setAddress(request.getAddress());
        profile.setSchoolName(request.getSchoolName());
        profile.setClassName(request.getClassName());
        profile.setEnrollmentDate(request.getEnrollmentDate());
        if (request.getStatus() != null) {
            profile.setStatus(request.getStatus());
        }
        linkGuardians(person, profile, request);
        personRepository.save(person);
        return toResponse(studentProfileRepository.save(profile));
    }

    /**
     * Resolve the login-holding guardian (mother when present, else father) and the denormalized other
     * parent (D4). The login guardian is created-or-linked as a Person: on confirmed link (linkPersonId)
     * the existing account is reused — a ParentProfile is added and PARENT granted via
     * PERSON_ROLE_CHANGED (the Shimona fix); otherwise a new parent login is minted (ParentCreatedEvent,
     * carrying the temp password). A GUARDIANSHIPS edge is written for the login guardian only.
     */
    private void linkGuardians(Person student, StudentProfile profile, StudentRequest request) {
        String fatherName = trimToNull(request.getFatherName());
        String fatherPhone = trimToNull(request.getFatherPhone());
        String motherName = trimToNull(request.getMotherName());
        String motherPhone = trimToNull(request.getMotherPhone());
        boolean hasMother = motherName != null && motherPhone != null;
        boolean hasFather = fatherName != null && fatherPhone != null;

        if (hasMother) {
            linkLoginGuardian(student, motherName, motherPhone, Relationship.MOTHER, request.getMotherLinkPersonId());
            if (hasFather) {
                setOtherParent(profile, fatherName, fatherPhone, Relationship.FATHER);
            }
        } else if (hasFather) {
            linkLoginGuardian(student, fatherName, fatherPhone, Relationship.FATHER, request.getFatherLinkPersonId());
        }
    }

    private void setOtherParent(StudentProfile profile, String name, String phone, Relationship rel) {
        profile.setOtherParentName(name);
        profile.setOtherParentPhone(phone);
        profile.setOtherParentRelationship(rel.name());
    }

    private void linkLoginGuardian(Person student, String name, String phone,
                                   Relationship relationship, UUID linkPersonId) {
        Person guardian;
        boolean addedParentRole;

        if (linkPersonId != null) {
            // Confirmed link (OQ1): reuse the existing account.
            guardian = personRepository.findById(linkPersonId)
                    .orElseThrow(() -> ApiException.notFound("Person not found for link id: " + linkPersonId));
            addedParentRole = !parentProfileRepository.existsById(guardian.getId());
            if (addedParentRole) {
                parentProfileRepository.save(ParentProfile.builder()
                        .person(guardian).status("ACTIVE").build());
                kafkaTemplate.send(KafkaTopics.PERSON_ROLE_CHANGED, guardian.getId().toString(),
                        PersonRoleChangedEvent.builder()
                                .personId(guardian.getId())
                                .loginId(guardian.getLoginId())
                                .addedRoles(List.of(RoleName.PARENT))
                                .removedRoles(List.of())
                                .renameUsernameTo(null)
                                .occurredAt(Instant.now())
                                .build());
                log.info("Added PARENT role to existing person id={} (linked as guardian of student id={})",
                        guardian.getId(), student.getId());
            }
        } else {
            // Fresh parent login: loginId IS the phone number.
            guardian = Person.builder()
                    .loginId(phone)
                    .firstName(name)
                    .phoneNumber(phone)
                    .status("ACTIVE")
                    .build();
            guardian = personRepository.save(guardian);
            parentProfileRepository.save(ParentProfile.builder()
                    .person(guardian).status("ACTIVE").build());
            kafkaTemplate.send(KafkaTopics.PARENT_CREATED, guardian.getId().toString(),
                    ParentCreatedEvent.builder()
                            .parentId(guardian.getId())
                            .username(guardian.getLoginId())
                            .email(guardian.getEmail())
                            .phone(guardian.getPhoneNumber())
                            .temporaryPassword(defaultTemporaryPassword)
                            .firstName(guardian.getFirstName())
                            .lastName(guardian.getLastName())
                            .roles(List.of(RoleName.PARENT))
                            .occurredAt(Instant.now())
                            .build());
            log.info("Auto-created parent login id={} loginId={} ({}) for student id={}",
                    guardian.getId(), guardian.getLoginId(), relationship, student.getId());
        }

        Guardianship.Key key = new Guardianship.Key(guardian.getId(), student.getId());
        if (!guardianshipRepository.existsById(key)) {
            guardianshipRepository.save(Guardianship.builder()
                    .guardianPersonId(guardian.getId())
                    .studentPersonId(student.getId())
                    .relationship(relationship)
                    .build());
        }
    }

    public void deleteStudent(UUID id) {
        StudentProfile profile = findProfile(id);
        Person person = profile.getPerson();
        String loginId = person.getLoginId();

        List<Guardianship> guardianEdges = guardianshipRepository.findByStudentPersonId(id);
        List<UUID> guardianIds = guardianEdges.stream().map(Guardianship::getGuardianPersonId).toList();
        guardianshipRepository.deleteByStudentPersonId(id);
        studentProfileRepository.delete(profile);
        studentProfileRepository.flush();

        if (personRoleService.holdsNothing(id)) {
            personRepository.delete(person);
            kafkaTemplate.send(KafkaTopics.STUDENT_DELETED, id.toString(),
                    StudentDeletedEvent.builder()
                            .studentId(id)
                            .username(loginId)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Deleted person id={} (held no other role after student delete)", id);
        } else {
            kafkaTemplate.send(KafkaTopics.PERSON_ROLE_CHANGED, id.toString(),
                    PersonRoleChangedEvent.builder()
                            .personId(id)
                            .loginId(loginId)
                            .addedRoles(List.of())
                            .removedRoles(List.of(RoleName.STUDENT))
                            .renameUsernameTo(null)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Removed student profile from person id={}; login retained", id);
        }

        // Cascade: a parent whose only ward was this student, and who holds no other role, is removed.
        for (UUID guardianId : guardianIds) {
            if (guardianshipRepository.findByGuardianPersonId(guardianId).isEmpty()) {
                parentProfileRepository.deleteById(guardianId);
                parentProfileRepository.flush();
                if (personRoleService.holdsNothing(guardianId)) {
                    Person guardian = personRepository.findById(guardianId).orElse(null);
                    String guardianLogin = guardian == null ? null : guardian.getLoginId();
                    if (guardian != null) {
                        personRepository.delete(guardian);
                    }
                    kafkaTemplate.send(KafkaTopics.PARENT_DELETED, guardianId.toString(),
                            com.artacademy.common.events.ParentDeletedEvent.builder()
                                    .parentId(guardianId)
                                    .username(guardianLogin)
                                    .occurredAt(Instant.now())
                                    .build());
                    log.info("Deleted parent person id={} (no wards, no other role remaining)", guardianId);
                } else {
                    kafkaTemplate.send(KafkaTopics.PERSON_ROLE_CHANGED, guardianId.toString(),
                            PersonRoleChangedEvent.builder()
                                    .personId(guardianId)
                                    .loginId(personRepository.findById(guardianId).map(Person::getLoginId).orElse(null))
                                    .addedRoles(List.of())
                                    .removedRoles(List.of(RoleName.PARENT))
                                    .renameUsernameTo(null)
                                    .occurredAt(Instant.now())
                                    .build());
                    log.info("Removed PARENT role from person id={}; login retained (other roles remain)", guardianId);
                }
            }
        }
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? defaultTemporaryPassword : requested;
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private StudentProfile findProfile(UUID personId) {
        return studentProfileRepository.findById(personId)
                .orElseThrow(() -> ApiException.notFound("Student not found with id: " + personId));
    }

    private StudentResponse toResponse(StudentProfile profile) {
        Person p = profile.getPerson();
        List<ParentRef> parents = new ArrayList<>();
        for (Guardianship g : guardianshipRepository.findByStudentPersonId(p.getId())) {
            personRepository.findById(g.getGuardianPersonId()).ifPresent(gp ->
                    parents.add(ParentRef.builder()
                            .id(gp.getId())
                            .name(fullName(gp))
                            .relationship(g.getRelationship() == null ? null : g.getRelationship().name())
                            .phone(gp.getPhoneNumber())
                            .build()));
        }
        return StudentResponse.builder()
                .id(p.getId())
                .loginId(p.getLoginId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .dob(profile.getDob())
                .email(p.getEmail())
                .address(profile.getAddress())
                .schoolName(profile.getSchoolName())
                .className(profile.getClassName())
                .enrollmentDate(profile.getEnrollmentDate())
                .status(profile.getStatus())
                .parents(parents)
                .otherParentName(profile.getOtherParentName())
                .otherParentPhone(profile.getOtherParentPhone())
                .otherParentRelationship(profile.getOtherParentRelationship())
                .build();
    }

    private String fullName(Person person) {
        String name = (person.getFirstName() == null ? "" : person.getFirstName())
                + (person.getLastName() == null ? "" : " " + person.getLastName());
        return name.trim();
    }
}
