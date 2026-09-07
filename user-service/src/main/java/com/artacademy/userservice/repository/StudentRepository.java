package com.artacademy.userservice.repository;

import com.artacademy.userservice.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    Optional<Student> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);
}
