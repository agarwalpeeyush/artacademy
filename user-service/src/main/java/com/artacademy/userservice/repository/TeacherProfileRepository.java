package com.artacademy.userservice.repository;

import com.artacademy.userservice.domain.TeacherProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, UUID> {

    boolean existsByEmployeeCode(String employeeCode);
}
