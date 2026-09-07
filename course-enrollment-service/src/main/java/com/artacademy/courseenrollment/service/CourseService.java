package com.artacademy.courseenrollment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.dto.CourseRequest;
import com.artacademy.courseenrollment.dto.CourseResponse;
import com.artacademy.courseenrollment.mapper.CourseMapper;
import com.artacademy.courseenrollment.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;

    @Transactional(readOnly = true)
    public List<CourseResponse> getAllCourses() {
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> getCoursesByType(String courseType) {
        return courseRepository.findByCourseType(courseType)
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourseById(UUID id) {
        Course course = findCourseById(id);
        return courseMapper.toResponse(course);
    }

    public CourseResponse createCourse(CourseRequest request) {
        if (courseRepository.existsByCourseCode(request.getCourseCode())) {
            throw ApiException.conflict(
                    "Course with code '" + request.getCourseCode() + "' already exists");
        }
        Course course = courseMapper.toEntity(request);
        Course saved = courseRepository.save(course);
        log.info("Created course id={}, code={}", saved.getId(), saved.getCourseCode());
        return courseMapper.toResponse(saved);
    }

    public CourseResponse updateCourse(UUID id, CourseRequest request) {
        Course course = findCourseById(id);
        if (!course.getCourseCode().equals(request.getCourseCode())
                && courseRepository.existsByCourseCode(request.getCourseCode())) {
            throw ApiException.conflict(
                    "Course with code '" + request.getCourseCode() + "' already exists");
        }
        courseMapper.updateEntityFromRequest(request, course);
        Course updated = courseRepository.save(course);
        log.info("Updated course id={}", updated.getId());
        return courseMapper.toResponse(updated);
    }

    public void deleteCourse(UUID id) {
        Course course = findCourseById(id);
        courseRepository.delete(course);
        log.info("Deleted course id={}", id);
    }

    private Course findCourseById(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course not found with id: " + id));
    }
}
