package com.artacademy.courseenrollment.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.dto.CourseTypeRequest;
import com.artacademy.courseenrollment.dto.CourseTypeResponse;
import com.artacademy.courseenrollment.service.CourseTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/course-types")
@RequiredArgsConstructor
@Tag(name = "Course Types", description = "Course-type lookup catalog")
public class CourseTypeController {

    private final CourseTypeService courseTypeService;

    @GetMapping
    @Operation(summary = "Get all course types")
    public ResponseEntity<ApiResponse<List<CourseTypeResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(courseTypeService.getAll()));
    }

    @PostMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Create a course type (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<CourseTypeResponse>> create(
            @Valid @RequestBody CourseTypeRequest request) {
        CourseTypeResponse created = courseTypeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Update a course type (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<CourseTypeResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CourseTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(courseTypeService.update(id, request)));
    }
}
