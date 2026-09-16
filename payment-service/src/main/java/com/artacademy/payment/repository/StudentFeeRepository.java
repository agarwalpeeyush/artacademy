package com.artacademy.payment.repository;

import com.artacademy.payment.domain.EnrollmentStatus;
import com.artacademy.payment.domain.StudentFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudentFeeRepository extends JpaRepository<StudentFee, UUID> {

    List<StudentFee> findByStatus(EnrollmentStatus status);

    List<StudentFee> findByCourseId(UUID courseId);

    List<StudentFee> findByTeacherId(UUID teacherId);
}
