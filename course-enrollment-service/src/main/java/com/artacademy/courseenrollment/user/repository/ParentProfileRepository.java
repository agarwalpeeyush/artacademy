package com.artacademy.courseenrollment.user.repository;

import com.artacademy.courseenrollment.user.domain.ParentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ParentProfileRepository extends JpaRepository<ParentProfile, UUID> {
}
