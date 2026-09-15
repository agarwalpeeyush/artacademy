package com.artacademy.userservice.service;

import com.artacademy.userservice.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAccountService {

    private final PersonRepository personRepository;

    /** True when no Person already owns this login ID. */
    @Transactional(readOnly = true)
    public boolean isLoginIdAvailable(String loginId) {
        return !personRepository.existsByLoginId(loginId);
    }
}
