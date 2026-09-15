package com.artacademy.userservice.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.common.security.RoleName;
import com.artacademy.userservice.domain.Person;
import com.artacademy.userservice.repository.ParentProfileRepository;
import com.artacademy.userservice.repository.PersonRepository;
import com.artacademy.userservice.repository.StudentProfileRepository;
import com.artacademy.userservice.repository.TeacherProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Central identity/role helper. Resolves the current user by the stable {@code personId} (D5), and
 * derives effective roles = {role per profile held} ∪ {explicitly-granted elevated roles} (OQ2).
 */
@Service
@RequiredArgsConstructor
public class PersonRoleService {

    private final PersonRepository personRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ParentProfileRepository parentProfileRepository;

    /** The personId placed in auth details by JwtAuthenticationFilter (D5), or null for legacy tokens. */
    public UUID currentPersonId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null) {
            return null;
        }
        Object details = auth.getDetails();
        if (details instanceof String s && !s.isBlank()) {
            return UUID.fromString(s);
        }
        return null;
    }

    /** Resolve the current Person by personId (D5), falling back to the username loginId for legacy tokens. */
    @Transactional(readOnly = true)
    public Person currentPerson() {
        UUID personId = currentPersonId();
        if (personId != null) {
            return personRepository.findById(personId)
                    .orElseThrow(() -> ApiException.notFound("Person not found for id: " + personId));
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String loginId = auth == null ? null : auth.getName();
        if (loginId == null) {
            throw ApiException.forbidden("No authenticated principal");
        }
        return personRepository.findByLoginId(loginId)
                .orElseThrow(() -> ApiException.notFound("Person not found for login: " + loginId));
    }

    /** Effective roles for a Person: derived from profiles held, unioned with explicit elevated roles. */
    @Transactional(readOnly = true)
    public List<String> effectiveRoles(UUID personId) {
        Set<String> roles = new LinkedHashSet<>();
        if (teacherProfileRepository.existsById(personId)) {
            roles.add(RoleName.TEACHER);
        }
        if (studentProfileRepository.existsById(personId)) {
            roles.add(RoleName.STUDENT);
        }
        if (parentProfileRepository.existsById(personId)) {
            roles.add(RoleName.PARENT);
        }
        personRepository.findById(personId)
                .ifPresent(p -> roles.addAll(p.getElevatedRoles()));
        return List.copyOf(roles);
    }

    /** True when the Person holds no profile and no elevated role — the login should be fully removed (OQ4). */
    @Transactional(readOnly = true)
    public boolean holdsNothing(UUID personId) {
        return effectiveRoles(personId).isEmpty();
    }
}
