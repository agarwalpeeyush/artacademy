package com.artacademy.courseenrollment.payment.repository;

import com.artacademy.courseenrollment.payment.domain.StudentCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StudentCreditRepository extends JpaRepository<StudentCredit, UUID> {
}
