package com.artacademy.userservice.repository;

import com.artacademy.userservice.domain.TeacherAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TeacherAvailabilityRepository extends JpaRepository<TeacherAvailability, UUID> {

    List<TeacherAvailability> findByTeacherId(UUID teacherId);

    void deleteByTeacherId(UUID teacherId);
}
