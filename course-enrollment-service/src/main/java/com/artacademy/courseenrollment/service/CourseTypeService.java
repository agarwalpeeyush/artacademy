package com.artacademy.courseenrollment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.courseenrollment.domain.CourseType;
import com.artacademy.courseenrollment.dto.CourseTypeRequest;
import com.artacademy.courseenrollment.dto.CourseTypeResponse;
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
public class CourseTypeService {

    private final CourseTypeRepository courseTypeRepository;
    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<CourseTypeResponse> getAll() {
        return courseTypeRepository.findAll().stream().map(this::toResponse).toList();
    }

    public CourseTypeResponse create(CourseTypeRequest request) {
        if (courseTypeRepository.existsByCode(request.getCode())) {
            throw ApiException.conflict("Course type with code '" + request.getCode() + "' already exists");
        }
        CourseType type = CourseType.builder()
                .code(request.getCode())
                .name(request.getName())
                .status(request.getStatus())
                .build();
        CourseType saved = courseTypeRepository.save(type);
        log.info("Created course type id={}, code={}", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    public CourseTypeResponse update(UUID id, CourseTypeRequest request) {
        CourseType type = courseTypeRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course type not found with id: " + id));
        if (!type.getCode().equals(request.getCode()) && courseTypeRepository.existsByCode(request.getCode())) {
            throw ApiException.conflict("Course type with code '" + request.getCode() + "' already exists");
        }
        type.setCode(request.getCode());
        type.setName(request.getName());
        type.setStatus(request.getStatus());
        return toResponse(courseTypeRepository.save(type));
    }

    public void delete(UUID id) {
        CourseType type = courseTypeRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course type not found with id: " + id));
        long inUse = courseRepository.countByCourseType_Id(id);
        if (inUse > 0) {
            throw ApiException.conflict("Course type '" + type.getCode()
                    + "' is in use by " + inUse + " course(s) and cannot be deleted");
        }
        courseTypeRepository.delete(type);
        log.info("Deleted course type id={}, code={}", id, type.getCode());
    }

    private CourseTypeResponse toResponse(CourseType type) {
        return CourseTypeResponse.builder()
                .id(type.getId())
                .code(type.getCode())
                .name(type.getName())
                .status(type.getStatus())
                .build();
    }
}
