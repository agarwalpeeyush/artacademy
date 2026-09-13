package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.CourseFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CourseFeeRepository extends JpaRepository<CourseFee, UUID> {
}
