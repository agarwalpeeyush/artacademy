package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.CourseType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseTypeRepository extends JpaRepository<CourseType, UUID> {

    Optional<CourseType> findByCode(String code);

    boolean existsByCode(String code);
}
