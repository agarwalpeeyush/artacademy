package com.artacademy.payment.repository;

import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.StudentFeeCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentFeeCycleRepository extends JpaRepository<StudentFeeCycle, UUID> {

    List<StudentFeeCycle> findByStudentId(UUID studentId);

    Optional<StudentFeeCycle> findByStudentIdAndBillingMonthAndBillingYear(
            UUID studentId, Integer billingMonth, Integer billingYear);

    List<StudentFeeCycle> findByStatus(FeeStatus status);

    List<StudentFeeCycle> findByStudentIdAndStatus(UUID studentId, FeeStatus status);
}
