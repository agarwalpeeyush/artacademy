package com.artacademy.courseenrollment.user.repository;

import com.artacademy.courseenrollment.user.domain.TeacherProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, UUID> {

    boolean existsByEmployeeCode(String employeeCode);
}
