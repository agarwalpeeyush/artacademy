package com.artacademy.userservice.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EmailUniquenessValidator {

    private final UserRepository userRepository;

    public void assertEmailAvailable(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email '" + email + "' is already in use");
        }
    }

    /** Same as {@link #assertEmailAvailable(String)} but ignores the row owned by {@code selfId}. */
    public void assertEmailAvailable(String email, UUID selfId) {
        if (email == null || email.isBlank()) {
            return;
        }
        if (userRepository.existsByEmailAndIdNot(email, selfId)) {
            throw ApiException.conflict("Email '" + email + "' is already in use");
        }
    }
}
