package com.artacademy.courseenrollment.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.dto.ClassRequest;
import com.artacademy.courseenrollment.dto.ClassResponse;
import com.artacademy.courseenrollment.service.ClassService;
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
@RequestMapping("/classes")
@RequiredArgsConstructor
@Tag(name = "Classes", description = "Class management API")
public class ClassController {

    private final ClassService classService;

    @GetMapping
    @Operation(summary = "Get all classes")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getAllClasses() {
        return ResponseEntity.ok(ApiResponse.success(classService.getAllClasses()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get class by ID")
    public ResponseEntity<ApiResponse<ClassResponse>> getClassById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(classService.getClassById(id)));
    }

    @GetMapping("/teacher/{teacherId}")
    @Operation(summary = "Get all classes for a teacher")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getClassesByTeacher(
            @PathVariable("teacherId") UUID teacherId) {
        return ResponseEntity.ok(ApiResponse.success(classService.getClassesByTeacher(teacherId)));
    }

    @PostMapping
    @Operation(summary = "Create a new class (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<ClassResponse>> createClass(
            @Valid @RequestBody ClassRequest request) {
        ClassResponse created = classService.createClass(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing class (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<ClassResponse>> updateClass(
            @PathVariable UUID id,
            @Valid @RequestBody ClassRequest request) {
        return ResponseEntity.ok(ApiResponse.success(classService.updateClass(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a class (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<Void>> deleteClass(@PathVariable UUID id) {
        classService.deleteClass(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
