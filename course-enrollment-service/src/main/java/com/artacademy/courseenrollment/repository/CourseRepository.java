package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

    List<Course> findByCourseType(String courseType);

    List<Course> findByStatus(String status);

    boolean existsByCourseCode(String courseCode);
}
