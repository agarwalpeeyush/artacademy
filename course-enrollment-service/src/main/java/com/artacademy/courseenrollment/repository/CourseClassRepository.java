package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.CourseClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourseClassRepository extends JpaRepository<CourseClass, UUID> {

    List<CourseClass> findByCourseId(UUID courseId);

    List<CourseClass> findByTeacherId(UUID teacherId);
}
