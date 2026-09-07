package com.artacademy.payment.repository;

import com.artacademy.payment.domain.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, UUID> {

    List<PaymentAllocation> findByPayment_Id(UUID paymentId);

    List<PaymentAllocation> findByFeeDetail_Id(UUID feeDetailId);

    @Query("SELECT COALESCE(SUM(pa.allocatedAmount), 0) FROM PaymentAllocation pa WHERE pa.payment.id = :paymentId")
    BigDecimal sumAllocatedAmountByPaymentId(@Param("paymentId") UUID paymentId);
}
