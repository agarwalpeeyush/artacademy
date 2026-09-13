package com.artacademy.courseenrollment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.FeeCadence;
import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.domain.CourseFee;
import com.artacademy.courseenrollment.domain.CourseType;
import com.artacademy.courseenrollment.dto.CourseRequest;
import com.artacademy.courseenrollment.dto.CourseResponse;
import com.artacademy.courseenrollment.mapper.CourseMapper;
import com.artacademy.courseenrollment.repository.CourseRepository;
import com.artacademy.courseenrollment.repository.CourseTypeRepository;
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
    private final CourseTypeRepository courseTypeRepository;
    private final CourseMapper courseMapper;

    @Transactional(readOnly = true)
    public List<CourseResponse> getAllCourses() {
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> getCoursesByType(String courseTypeCode) {
        return courseRepository.findByCourseType_Code(courseTypeCode)
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourseById(UUID id) {
        return courseMapper.toResponse(findCourseById(id));
    }

    public CourseResponse createCourse(CourseRequest request) {
        if (courseRepository.existsByCourseCode(request.getCourseCode())) {
            throw ApiException.conflict(
                    "Course with code '" + request.getCourseCode() + "' already exists");
        }
        Course course = Course.builder()
                .courseCode(request.getCourseCode())
                .courseName(request.getCourseName())
                .courseType(resolveType(request.getCourseTypeCode()))
                .description(request.getDescription())
                .durationMonths(request.getDurationMonths())
                .status(request.getStatus())
                .build();
        applyFees(course, request);
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
        course.setCourseCode(request.getCourseCode());
        course.setCourseName(request.getCourseName());
        course.setCourseType(resolveType(request.getCourseTypeCode()));
        course.setDescription(request.getDescription());
        course.setDurationMonths(request.getDurationMonths());
        course.setStatus(request.getStatus());
        applyFees(course, request);
        Course updated = courseRepository.save(course);
        log.info("Updated course id={}", updated.getId());
        return courseMapper.toResponse(updated);
    }

    public void deleteCourse(UUID id) {
        Course course = findCourseById(id);
        courseRepository.delete(course);
        log.info("Deleted course id={}", id);
    }

    private CourseType resolveType(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return courseTypeRepository.findByCode(code)
                .orElseThrow(() -> ApiException.badRequest("Unknown course type code: " + code));
    }

    /** Replace the course's fee set with the request's fees (orphanRemoval clears removed rows). */
    private void applyFees(Course course, CourseRequest request) {
        course.getFees().clear();
        if (request.getFees() == null) {
            return;
        }
        for (CourseRequest.FeeItem item : request.getFees()) {
            FeeCadence cadence = item.getCadence() != null
                    ? item.getCadence() : item.getFeeType().getCadence();
            course.getFees().add(CourseFee.builder()
                    .course(course)
                    .feeType(item.getFeeType())
                    .amount(item.getAmount())
                    .cadence(cadence)
                    .build());
        }
    }

    private Course findCourseById(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course not found with id: " + id));
    }
}
