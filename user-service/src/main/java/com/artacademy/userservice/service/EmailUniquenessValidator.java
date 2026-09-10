package com.artacademy.userservice.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.repository.ParentRepository;
import com.artacademy.userservice.repository.StudentRepository;
import com.artacademy.userservice.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EmailUniquenessValidator {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;

    public void assertEmailAvailable(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        if (teacherRepository.existsByEmail(email)
                || studentRepository.existsByEmail(email)
                || parentRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email '" + email + "' is already in use");
        }
    }
}
