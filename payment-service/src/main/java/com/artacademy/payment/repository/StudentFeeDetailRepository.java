package com.artacademy.payment.repository;

import com.artacademy.payment.domain.FeeType;
import com.artacademy.payment.domain.StudentFeeDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentFeeDetailRepository extends JpaRepository<StudentFeeDetail, UUID> {

    List<StudentFeeDetail> findByEnrollmentId(UUID enrollmentId);

    Optional<StudentFeeDetail> findByEnrollmentIdAndFeeType(UUID enrollmentId, FeeType feeType);
}
