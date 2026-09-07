package com.artacademy.userservice.repository;

import com.artacademy.userservice.domain.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, UUID> {

    Optional<Teacher> findByLoginId(String loginId);

    boolean existsByEmployeeCode(String employeeCode);
}
