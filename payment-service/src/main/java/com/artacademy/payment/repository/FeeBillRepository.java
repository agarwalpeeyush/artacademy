package com.artacademy.payment.repository;

import com.artacademy.payment.domain.FeeBill;
import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.FeeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface FeeBillRepository extends JpaRepository<FeeBill, UUID> {

    List<FeeBill> findByStudentId(UUID studentId);

    List<FeeBill> findByStudentIdAndOutstandingBillTrue(UUID studentId);

    List<FeeBill> findByEnrollmentId(UUID enrollmentId);

    List<FeeBill> findByTeacherId(UUID teacherId);

    List<FeeBill> findByStatusIn(Collection<FeeStatus> statuses);

    boolean existsByEnrollmentIdAndFeeType(UUID enrollmentId, FeeType feeType);

    boolean existsByEnrollmentIdAndFeeTypeAndBillingMonthAndBillingYear(
            UUID enrollmentId, FeeType feeType, Integer billingMonth, Integer billingYear);
}
