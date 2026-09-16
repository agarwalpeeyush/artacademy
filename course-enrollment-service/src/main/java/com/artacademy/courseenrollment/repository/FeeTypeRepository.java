package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.FeeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeeTypeRepository extends JpaRepository<FeeType, String> {
}
