package com.artacademy.userservice.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.userservice.dto.TeacherAvailabilityExceptionRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityExceptionResponse;
import com.artacademy.userservice.dto.TeacherAvailabilityRequest;
import com.artacademy.userservice.dto.TeacherAvailabilityResponse;
import com.artacademy.userservice.dto.TeacherRequest;
import com.artacademy.userservice.dto.TeacherResponse;
import com.artacademy.userservice.dto.TeacherSelfUpdateRequest;
import com.artacademy.userservice.service.PersonRoleService;
import com.artacademy.userservice.service.TeacherService;
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

import java.util.List;
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

    @GetMapping("/{id}/availability")
    @Operation(summary = "Get teacher availability slots")
    public ResponseEntity<ApiResponse<List<TeacherAvailabilityResponse>>> getAvailability(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.getAvailability(id)));
    }

    @PutMapping("/{id}/availability")
    @Operation(summary = "Replace teacher availability slots")
    public ResponseEntity<ApiResponse<List<TeacherAvailabilityResponse>>> updateAvailability(
            @PathVariable UUID id,
            @Valid @RequestBody List<@Valid TeacherAvailabilityRequest> requests) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.updateAvailability(id, requests)));
    }

    @GetMapping("/{id}/availability-exceptions")
    @Operation(summary = "Get teacher one-off availability exceptions")
    public ResponseEntity<ApiResponse<List<TeacherAvailabilityExceptionResponse>>> getAvailabilityExceptions(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.getExceptions(id)));
    }

    @PostMapping("/{id}/availability-exceptions")
    @Operation(summary = "Add a one-off availability exception (leave/sick day)")
    public ResponseEntity<ApiResponse<TeacherAvailabilityExceptionResponse>> addAvailabilityException(
            @PathVariable UUID id,
            @Valid @RequestBody TeacherAvailabilityExceptionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(teacherService.addException(id, request)));
    }

    @DeleteMapping("/{id}/availability-exceptions/{exceptionId}")
    @Operation(summary = "Delete a teacher availability exception")
    public ResponseEntity<ApiResponse<Void>> deleteAvailabilityException(
            @PathVariable UUID id,
            @PathVariable UUID exceptionId) {
        teacherService.deleteException(id, exceptionId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
