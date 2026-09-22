package com.artacademy.courseenrollment.user.service;

import com.artacademy.courseenrollment.user.domain.Person;
import com.artacademy.courseenrollment.user.dto.PersonLookupResponse;
import com.artacademy.courseenrollment.user.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Phone-lookup for the confirm-and-link flow (OQ1). Returns candidate Persons matching a phone so a
 * create form can offer "link this existing account?". Phone is NOT unique (D2), so this may return
 * several; the caller confirms which to link via {@code linkPersonId}.
 */
@Service
@RequiredArgsConstructor
public class PersonLookupService {

    private final PersonRepository personRepository;
    private final PersonRoleService personRoleService;

    @Transactional(readOnly = true)
    public List<PersonLookupResponse> lookupByPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return List.of();
        }
        return personRepository.findByPhoneNumber(phone.trim()).stream()
                .map(this::toResponse)
                .toList();
    }

    private PersonLookupResponse toResponse(Person p) {
        return PersonLookupResponse.builder()
                .personId(p.getId())
                .loginId(p.getLoginId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .phoneNumber(p.getPhoneNumber())
                .roles(personRoleService.effectiveRoles(p.getId()))
                .build();
    }
}
