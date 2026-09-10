package com.artacademy.payment.repository;

import com.artacademy.payment.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByStudentId(UUID studentId);

    List<Payment> findByFeeCycle_Id(UUID feeCycleId);

    List<Payment> findByPaymentDateBetween(LocalDateTime start, LocalDateTime end);
}
