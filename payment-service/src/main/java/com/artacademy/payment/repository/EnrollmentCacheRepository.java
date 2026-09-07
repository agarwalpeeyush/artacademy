package com.artacademy.payment.repository;

import com.artacademy.payment.domain.EnrollmentCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EnrollmentCacheRepository extends JpaRepository<EnrollmentCache, UUID> {

    List<EnrollmentCache> findByStudentIdAndStatus(UUID studentId, String status);

    List<EnrollmentCache> findByStatus(String status);
}
