package com.artacademy.userservice.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.PersonRoleChangedEvent;
import com.artacademy.common.events.TeacherCreatedEvent;
import com.artacademy.common.events.TeacherDeletedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.security.RoleName;
import com.artacademy.userservice.domain.Person;
import com.artacademy.userservice.domain.TeacherAvailability;
import com.artacademy.userservice.domain.TeacherAvailabilityException;
import com.artacademy.userservice.domain.TeacherProfile;
import com.artacademy.userservice.dto.TeacherAvailabilityExceptionRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityExceptionResponse;
import com.artacademy.userservice.dto.TeacherAvailabilityRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityResponse;
import com.artacademy.userservice.dto.TeacherRequest;
import com.artacademy.userservice.dto.TeacherResponse;
import com.artacademy.userservice.dto.TeacherSelfUpdateRequest;
import com.artacademy.userservice.repository.PersonRepository;
import com.artacademy.userservice.repository.TeacherAvailabilityExceptionRepository;
import com.artacademy.userservice.repository.TeacherAvailabilityRepository;
import com.artacademy.userservice.repository.TeacherProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    /** Default initial auth password when the UI does not supply one. Sourced from config-server. */
    @Value("${artacademy.user.default-temporary-password}")
    private String defaultTemporaryPassword;

    private final PersonRepository personRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final TeacherAvailabilityRepository availabilityRepository;
    private final TeacherAvailabilityExceptionRepository availabilityExceptionRepository;
    private final PersonRoleService personRoleService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public Page<TeacherResponse> getAllTeachers(Pageable pageable) {
        return teacherProfileRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public TeacherResponse getTeacherById(UUID id) {
        return toResponse(findProfile(id));
    }

    @Transactional(readOnly = true)
    public TeacherResponse getTeacherByPersonId(UUID personId) {
        return toResponse(findProfile(personId));
    }

    public TeacherResponse updateMyProfile(UUID personId, TeacherSelfUpdateRequest request) {
        TeacherProfile profile = findProfile(personId);
        Person person = profile.getPerson();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setPhoneNumber(request.getPhone());
        profile.setQualification(request.getQualification());
        personRepository.save(person);
        return toResponse(teacherProfileRepository.save(profile));
    }

    /**
     * Create a teacher. If {@code linkPersonId} is set (confirmed phone match, OQ1) the existing Person's
     * account is reused: a TeacherProfile is added and the login is promoted to the teacher loginId (D3),
     * emitting PERSON_ROLE_CHANGED with the added roles and rename. Otherwise a fresh Person + login is
     * minted via TeacherCreatedEvent (carries the temp password).
     */
    public TeacherResponse createTeacher(TeacherRequest request) {
        if (request.getEmployeeCode() != null
                && teacherProfileRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw ApiException.conflict("Teacher with employee code '" + request.getEmployeeCode() + "' already exists");
        }

        List<String> additional = request.getAdditionalRoles() == null ? List.of() : request.getAdditionalRoles();
        boolean grantPrincipal = additional.contains(RoleName.PRINCIPAL);

        if (request.getLinkPersonId() != null) {
            return linkTeacherToExistingPerson(request, grantPrincipal);
        }

        if (personRepository.existsByLoginId(request.getLoginId())) {
            throw ApiException.conflict("Login ID '" + request.getLoginId() + "' is already taken");
        }

        Person person = Person.builder()
                .loginId(request.getLoginId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phoneNumber(request.getPhone())
                .status("ACTIVE")
                .build();
        if (grantPrincipal) {
            person.getElevatedRoles().add(RoleName.PRINCIPAL);
        }
        additional.stream().filter(r -> r.equals(RoleName.ADMIN)).forEach(person.getElevatedRoles()::add);
        person = personRepository.save(person);

        TeacherProfile profile = TeacherProfile.builder()
                .person(person)
                .employeeCode(request.getEmployeeCode())
                .qualification(request.getQualification())
                .joiningDate(request.getJoiningDate())
                .status(request.getStatus())
                .build();
        profile = teacherProfileRepository.save(profile);

        List<String> roles = personRoleService.effectiveRoles(person.getId());
        kafkaTemplate.send(KafkaTopics.TEACHER_CREATED, person.getId().toString(),
                TeacherCreatedEvent.builder()
                        .teacherId(person.getId())
                        .username(person.getLoginId())
                        .email(person.getEmail())
                        .temporaryPassword(resolveTemporaryPassword(request.getTemporaryPassword()))
                        .employeeCode(profile.getEmployeeCode())
                        .firstName(person.getFirstName())
                        .lastName(person.getLastName())
                        .roles(roles)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published TeacherCreatedEvent for person id={} roles={}", person.getId(), roles);
        return toResponse(profile);
    }

    /**
     * Create a Principal (ADMIN authority, A.6): a teacher Person that also carries the elevated PRINCIPAL
     * role. Delegates to {@link #createTeacher} with PRINCIPAL forced into additionalRoles, so the same
     * create-or-link + event logic applies.
     */
    public TeacherResponse createPrincipal(TeacherRequest request) {
        List<String> additional = new java.util.ArrayList<>(
                request.getAdditionalRoles() == null ? List.of() : request.getAdditionalRoles());
        if (!additional.contains(RoleName.PRINCIPAL)) {
            additional.add(RoleName.PRINCIPAL);
        }
        request.setAdditionalRoles(additional);
        return createTeacher(request);
    }

    private TeacherResponse linkTeacherToExistingPerson(TeacherRequest request, boolean grantPrincipal) {        Person person = personRepository.findById(request.getLinkPersonId())
                .orElseThrow(() -> ApiException.notFound("Person not found for link id: " + request.getLinkPersonId()));
        if (teacherProfileRepository.existsById(person.getId())) {
            throw ApiException.conflict("Person already holds a teacher profile");
        }

        String renameTo = null;
        String desiredLogin = request.getLoginId();
        if (desiredLogin != null && !desiredLogin.equals(person.getLoginId())) {
            if (personRepository.existsByLoginId(desiredLogin)) {
                throw ApiException.conflict("Login ID '" + desiredLogin + "' is already taken");
            }
            renameTo = desiredLogin;               // promote to staff loginId (D3)
            person.setLoginId(desiredLogin);
        }
        if (grantPrincipal) {
            person.getElevatedRoles().add(RoleName.PRINCIPAL);
        }
        person = personRepository.save(person);

        TeacherProfile profile = TeacherProfile.builder()
                .person(person)
                .employeeCode(request.getEmployeeCode())
                .qualification(request.getQualification())
                .joiningDate(request.getJoiningDate())
                .status(request.getStatus())
                .build();
        profile = teacherProfileRepository.save(profile);

        List<String> added = grantPrincipal ? List.of(RoleName.TEACHER, RoleName.PRINCIPAL) : List.of(RoleName.TEACHER);
        kafkaTemplate.send(KafkaTopics.PERSON_ROLE_CHANGED, person.getId().toString(),
                PersonRoleChangedEvent.builder()
                        .personId(person.getId())
                        .loginId(person.getLoginId())
                        .addedRoles(added)
                        .removedRoles(List.of())
                        .renameUsernameTo(renameTo)
                        .occurredAt(Instant.now())
                        .build());
        log.info("Published PersonRoleChangedEvent (add teacher) for person id={} added={} rename={}",
                person.getId(), added, renameTo);
        return toResponse(profile);
    }

    private String resolveTemporaryPassword(String requested) {
        return (requested == null || requested.isBlank()) ? defaultTemporaryPassword : requested;
    }

    public TeacherResponse updateTeacher(UUID id, TeacherRequest request) {
        TeacherProfile profile = findProfile(id);
        if (request.getEmployeeCode() != null
                && !request.getEmployeeCode().equals(profile.getEmployeeCode())
                && teacherProfileRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw ApiException.conflict("Teacher with employee code '" + request.getEmployeeCode() + "' already exists");
        }
        Person person = profile.getPerson();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setEmail(request.getEmail());
        person.setPhoneNumber(request.getPhone());
        profile.setEmployeeCode(request.getEmployeeCode());
        profile.setQualification(request.getQualification());
        profile.setJoiningDate(request.getJoiningDate());
        if (request.getStatus() != null) {
            profile.setStatus(request.getStatus());
        }
        personRepository.save(person);
        return toResponse(teacherProfileRepository.save(profile));
    }

    /**
     * Remove the teacher profile (and TEACHER role). If the Person retains any other profile or elevated
     * role its login survives with the remaining roles (PERSON_ROLE_CHANGED); otherwise the Person and
     * its login are fully removed (TeacherDeletedEvent). OQ4.
     */
    public void deleteTeacher(UUID id) {
        TeacherProfile profile = findProfile(id);
        Person person = profile.getPerson();
        String loginId = person.getLoginId();
        availabilityExceptionRepository.deleteByTeacherId(id);
        availabilityRepository.deleteByTeacherId(id);
        teacherProfileRepository.delete(profile);
        teacherProfileRepository.flush();

        // PRINCIPAL/ADMIN with no profile hangs on the same Person; removing the teacher profile drops it too.
        person.getElevatedRoles().remove(RoleName.PRINCIPAL);

        if (personRoleService.holdsNothing(id)) {
            personRepository.delete(person);
            kafkaTemplate.send(KafkaTopics.TEACHER_DELETED, id.toString(),
                    TeacherDeletedEvent.builder()
                            .teacherId(id)
                            .username(loginId)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Deleted person id={} (held no other role after teacher delete)", id);
        } else {
            personRepository.save(person);
            List<String> removed = List.of(RoleName.TEACHER, RoleName.PRINCIPAL);
            kafkaTemplate.send(KafkaTopics.PERSON_ROLE_CHANGED, id.toString(),
                    PersonRoleChangedEvent.builder()
                            .personId(id)
                            .loginId(loginId)
                            .addedRoles(List.of())
                            .removedRoles(removed)
                            .renameUsernameTo(null)
                            .occurredAt(Instant.now())
                            .build());
            log.info("Removed teacher profile from person id={}; login retained with roles={}",
                    id, personRoleService.effectiveRoles(id));
        }
    }

    @Transactional(readOnly = true)
    public List<TeacherAvailabilityResponse> getAvailability(UUID teacherId) {
        findProfile(teacherId);
        return availabilityRepository.findByTeacherId(teacherId).stream()
                .map(this::toAvailabilityResponse).toList();
    }

    public List<TeacherAvailabilityResponse> updateAvailability(UUID teacherId, List<TeacherAvailabilityRequest> requests) {
        Person teacher = findProfile(teacherId).getPerson();
        requests.forEach(r -> requireEndAfterStart(r.getStartTime(), r.getEndTime()));
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
        findProfile(teacherId);
        return availabilityExceptionRepository.findByTeacherIdOrderByDateDesc(teacherId).stream()
                .map(this::toExceptionResponse).toList();
    }

    public TeacherAvailabilityExceptionResponse addException(UUID teacherId, TeacherAvailabilityExceptionRequest request) {
        Person teacher = findProfile(teacherId).getPerson();
        if (!request.isUnavailableAllDay()) {
            if (request.getStartTime() == null || request.getEndTime() == null) {
                throw ApiException.badRequest("Start and end time are required unless the exception is all day");
            }
            requireEndAfterStart(request.getStartTime(), request.getEndTime());
        }
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

    private TeacherProfile findProfile(UUID personId) {
        return teacherProfileRepository.findById(personId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found with id: " + personId));
    }

    private void requireEndAfterStart(java.time.LocalTime start, java.time.LocalTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw ApiException.badRequest("End time must be after start time");
        }
    }

    private TeacherResponse toResponse(TeacherProfile profile) {
        Person p = profile.getPerson();
        return TeacherResponse.builder()
                .id(p.getId())
                .loginId(p.getLoginId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .employeeCode(profile.getEmployeeCode())
                .email(p.getEmail())
                .phone(p.getPhoneNumber())
                .qualification(profile.getQualification())
                .joiningDate(profile.getJoiningDate())
                .status(profile.getStatus())
                .build();
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
