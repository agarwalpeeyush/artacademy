package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    List<Enrollment> findByStudentId(UUID studentId);

    List<Enrollment> findByCourseId(UUID courseId);

    List<Enrollment> findByClassId(UUID classId);

    Optional<Enrollment> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    long countByClassIdAndStatus(UUID classId, String status);
}
