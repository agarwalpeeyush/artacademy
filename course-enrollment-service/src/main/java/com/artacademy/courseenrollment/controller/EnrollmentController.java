package com.artacademy.courseenrollment.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import com.artacademy.courseenrollment.service.EnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
@Tag(name = "Enrollments", description = "Enrollment management API")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @PostMapping
    @Operation(summary = "Enroll a student in a course/class (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enrollStudent(
            @Valid @RequestBody EnrollmentRequest request) {
        EnrollmentResponse created = enrollmentService.enrollStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Get all enrollments for a student")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getEnrollmentsByStudent(
            @PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.getEnrollmentsByStudentId(studentId)));
    }

    @GetMapping("/course/{courseId}")
    @Operation(summary = "Get all enrollments for a course")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getEnrollmentsByCourse(
            @PathVariable("courseId") UUID courseId) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.getEnrollmentsByCourseId(courseId)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel (delete) an enrollment (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<Void>> cancelEnrollment(@PathVariable("id") UUID id) {
        enrollmentService.cancelEnrollment(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
