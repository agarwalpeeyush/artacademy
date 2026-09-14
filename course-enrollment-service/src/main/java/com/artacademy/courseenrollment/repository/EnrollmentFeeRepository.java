package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.EnrollmentFee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EnrollmentFeeRepository extends JpaRepository<EnrollmentFee, UUID> {

    List<EnrollmentFee> findByEnrollmentId(UUID enrollmentId);
}
