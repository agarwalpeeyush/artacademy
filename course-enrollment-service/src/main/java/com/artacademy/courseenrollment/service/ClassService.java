package com.artacademy.courseenrollment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.courseenrollment.domain.CourseClass;
import com.artacademy.courseenrollment.dto.ClassRequest;
import com.artacademy.courseenrollment.dto.ClassResponse;
import com.artacademy.courseenrollment.mapper.ClassMapper;
import com.artacademy.courseenrollment.repository.CourseClassRepository;
import com.artacademy.courseenrollment.repository.EnrollmentRepository;
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
public class ClassService {

    private final CourseClassRepository courseClassRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ClassMapper classMapper;

    @Transactional(readOnly = true)
    public List<ClassResponse> getAllClasses() {
        return courseClassRepository.findAll()
                .stream()
                .map(classMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClassResponse getClassById(UUID id) {
        CourseClass courseClass = findClassById(id);
        return classMapper.toResponse(courseClass);
    }

    public ClassResponse createClass(ClassRequest request) {
        if (request.getCapacity() == null || request.getCapacity() <= 0) {
            throw ApiException.badRequest("Capacity must be greater than zero");
        }
        CourseClass courseClass = classMapper.toEntity(request);
        CourseClass saved = courseClassRepository.save(courseClass);
        log.info("Created class id={}, name={}", saved.getId(), saved.getClassName());
        return classMapper.toResponse(saved);
    }

    public ClassResponse updateClass(UUID id, ClassRequest request) {
        if (request.getCapacity() == null || request.getCapacity() <= 0) {
            throw ApiException.badRequest("Capacity must be greater than zero");
        }

        CourseClass courseClass = findClassById(id);

        long currentEnrollments = enrollmentRepository.countByClassId(id);
        if (request.getCapacity() < currentEnrollments) {
            throw ApiException.badRequest(
                    "New capacity (" + request.getCapacity() + ") is less than current enrollment count ("
                    + currentEnrollments + ")");
        }

        classMapper.updateEntityFromRequest(request, courseClass);
        CourseClass updated = courseClassRepository.save(courseClass);
        log.info("Updated class id={}", updated.getId());
        return classMapper.toResponse(updated);
    }

    public void deleteClass(UUID id) {
        CourseClass courseClass = findClassById(id);
        courseClassRepository.delete(courseClass);
        log.info("Deleted class id={}", id);
    }

    private CourseClass findClassById(UUID id) {
        return courseClassRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Class not found with id: " + id));
    }
}
