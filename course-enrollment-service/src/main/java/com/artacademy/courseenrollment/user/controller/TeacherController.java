package com.artacademy.courseenrollment.user.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.user.dto.TeacherRequest;
import com.artacademy.courseenrollment.user.dto.TeacherResponse;
import com.artacademy.courseenrollment.user.dto.TeacherSelfUpdateRequest;
import com.artacademy.courseenrollment.user.service.PersonRoleService;
import com.artacademy.courseenrollment.user.service.TeacherService;
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
@RequestMapping("/teachers")
@RequiredArgsConstructor
@Tag(name = "Teachers", description = "Teacher management API")
public class TeacherController {

    private final TeacherService teacherService;
    private final PersonRoleService personRoleService;

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated teacher's profile")
    public ResponseEntity<ApiResponse<TeacherResponse>> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                teacherService.getTeacherByPersonId(personRoleService.currentPersonId())));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the authenticated teacher's own contact details")
    public ResponseEntity<ApiResponse<TeacherResponse>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody TeacherSelfUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                teacherService.updateMyProfile(personRoleService.currentPersonId(), request)));
    }

    @GetMapping
    @Operation(summary = "Get all teachers (paginated)")
    public ResponseEntity<ApiResponse<Page<TeacherResponse>>> getAllTeachers(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.getAllTeachers(pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get teacher by ID")
    public ResponseEntity<ApiResponse<TeacherResponse>> getTeacherById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.getTeacherById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new teacher")
    public ResponseEntity<ApiResponse<TeacherResponse>> createTeacher(
            @Valid @RequestBody TeacherRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(teacherService.createTeacher(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing teacher")
    public ResponseEntity<ApiResponse<TeacherResponse>> updateTeacher(
            @PathVariable UUID id,
            @Valid @RequestBody TeacherRequest request) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.updateTeacher(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a teacher")
    public ResponseEntity<ApiResponse<Void>> deleteTeacher(@PathVariable UUID id) {
        teacherService.deleteTeacher(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
