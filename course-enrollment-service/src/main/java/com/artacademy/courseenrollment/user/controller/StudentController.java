package com.artacademy.courseenrollment.user.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.user.dto.StudentRequest;
import com.artacademy.courseenrollment.user.dto.StudentResponse;
import com.artacademy.courseenrollment.user.dto.StudentSelfUpdateRequest;
import com.artacademy.courseenrollment.user.service.PersonRoleService;
import com.artacademy.courseenrollment.user.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/students")
@RequiredArgsConstructor
@Tag(name = "Students", description = "Student management API")
public class StudentController {

    private final StudentService studentService;
    private final PersonRoleService personRoleService;

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated student's profile")
    public ResponseEntity<ApiResponse<StudentResponse>> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                studentService.getStudentByPersonId(personRoleService.currentPersonId())));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the authenticated student's own contact details")
    public ResponseEntity<ApiResponse<StudentResponse>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody StudentSelfUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                studentService.updateMyProfile(personRoleService.currentPersonId(), request)));
    }

    @GetMapping
    @Operation(summary = "Get all students (paginated)")
    public ResponseEntity<ApiResponse<Page<StudentResponse>>> getAllStudents(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getAllStudents(pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get student by ID")
    public ResponseEntity<ApiResponse<StudentResponse>> getStudentById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getStudentById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new student")
    public ResponseEntity<ApiResponse<StudentResponse>> createStudent(
            @Valid @RequestBody StudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(studentService.createStudent(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing student")
    public ResponseEntity<ApiResponse<StudentResponse>> updateStudent(
            @PathVariable UUID id,
            @Valid @RequestBody StudentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(studentService.updateStudent(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a student")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable UUID id) {
        studentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
