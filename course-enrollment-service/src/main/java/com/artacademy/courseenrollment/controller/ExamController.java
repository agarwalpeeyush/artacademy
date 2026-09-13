package com.artacademy.courseenrollment.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.dto.ExamRequest;
import com.artacademy.courseenrollment.dto.ExamResponse;
import com.artacademy.courseenrollment.service.ExamService;
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
@RequestMapping("/exams")
@RequiredArgsConstructor
@Tag(name = "Exams", description = "Exam scheduling API")
public class ExamController {

    private final ExamService examService;

    @GetMapping
    @Operation(summary = "Get all exams, optionally filtered by course")
    public ResponseEntity<ApiResponse<List<ExamResponse>>> getExams(
            @RequestParam(required = false) UUID courseId) {
        List<ExamResponse> exams = courseId != null
                ? examService.getExamsByCourse(courseId)
                : examService.getAllExams();
        return ResponseEntity.ok(ApiResponse.success(exams));
    }

    @PostMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Schedule an exam for a course (PRINCIPAL only)")
    public ResponseEntity<ApiResponse<ExamResponse>> scheduleExam(
            @Valid @RequestBody ExamRequest request) {
        ExamResponse created = examService.scheduleExam(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }
}
