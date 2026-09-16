package com.artacademy.payment.repository;

import com.artacademy.payment.domain.StudentCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StudentCreditRepository extends JpaRepository<StudentCredit, UUID> {
}
