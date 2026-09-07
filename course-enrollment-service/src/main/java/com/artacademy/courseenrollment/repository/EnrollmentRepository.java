package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    List<Enrollment> findByStudentId(UUID studentId);

    List<Enrollment> findByStudentIdAndStatus(UUID studentId, String status);

    boolean existsByStudentIdAndCourseIdAndStatus(UUID studentId, UUID courseId, String status);

    long countByClassId(UUID classId);
}
