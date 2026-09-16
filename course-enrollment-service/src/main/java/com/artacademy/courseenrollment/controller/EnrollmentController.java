package com.artacademy.courseenrollment.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.dto.EnrollmentFeesUpdateRequest;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import com.artacademy.courseenrollment.dto.EnrollmentStatusRequest;
import com.artacademy.courseenrollment.dto.EnrollmentTimetablesRequest;
import com.artacademy.courseenrollment.service.EnrollmentService;
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
@RequestMapping("/enrollments")
@RequiredArgsConstructor
@Tag(name = "Enrollments", description = "Enrollment management API")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Enroll a student in a course (PRINCIPAL or TEACHER)")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enrollStudent(
            @Valid @RequestBody EnrollmentRequest request) {
        EnrollmentResponse created = enrollmentService.enrollStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @GetMapping
    @Operation(summary = "Get all enrollments")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getAllEnrollments() {
        return ResponseEntity.ok(ApiResponse.success(enrollmentService.getAllEnrollments()));
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

    @GetMapping("/timetable/{timetableId}")
    @Operation(summary = "Get the active roster assigned to a timetable slot")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getEnrollmentsByTimetable(
            @PathVariable("timetableId") UUID timetableId) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.getEnrollmentsByTimetableId(timetableId)));
    }

    @GetMapping("/teacher/{teacherId}")
    @Operation(summary = "Get all enrollments for a teacher")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getEnrollmentsByTeacher(
            @PathVariable("teacherId") UUID teacherId) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.getEnrollmentsByTeacherId(teacherId)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single enrollment by id")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> getEnrollmentById(
            @PathVariable("id") UUID id) {
        return ResponseEntity.ok(ApiResponse.success(enrollmentService.getById(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Cancel (delete) an enrollment (PRINCIPAL or TEACHER)")
    public ResponseEntity<ApiResponse<Void>> cancelEnrollment(@PathVariable("id") UUID id) {
        enrollmentService.cancelEnrollment(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Update an enrollment's status (PRINCIPAL or TEACHER)")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> updateStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody EnrollmentStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.updateStatus(id, request.getStatus())));
    }

    @PutMapping("/{id}/fees")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Override the fee lines on an enrollment (PRINCIPAL or TEACHER)")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> updateFees(
            @PathVariable("id") UUID id,
            @Valid @RequestBody EnrollmentFeesUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.updateFees(id, request.getFees())));
    }

    @PutMapping("/{id}/timetables")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Assign the timetable slots an enrolled child attends (PRINCIPAL or TEACHER)")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> updateTimetables(
            @PathVariable("id") UUID id,
            @Valid @RequestBody EnrollmentTimetablesRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                enrollmentService.updateTimetables(id, request.getTimetableIds())));
    }
}
