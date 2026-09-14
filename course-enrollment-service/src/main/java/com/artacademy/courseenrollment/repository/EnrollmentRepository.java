package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    List<Enrollment> findByStudentId(UUID studentId);

    List<Enrollment> findByCourseId(UUID courseId);

    Optional<Enrollment> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    @Query("SELECT DISTINCT e FROM Enrollment e JOIN e.timetables t WHERE t.id = :timetableId")
    List<Enrollment> findByTimetableId(@Param("timetableId") UUID timetableId);
}
