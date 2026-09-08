package com.artacademy.attendance.controller;

import com.artacademy.attendance.domain.CorrectionStatus;
import com.artacademy.attendance.dto.AttendanceCorrectionRequest;
import com.artacademy.attendance.dto.AttendanceCorrectionResponse;
import com.artacademy.attendance.dto.AttendanceCorrectionReviewRequest;
import com.artacademy.attendance.service.AttendanceCorrectionService;
import com.artacademy.common.dto.ApiResponse;
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
@RequestMapping("/attendance/corrections")
@RequiredArgsConstructor
@Tag(name = "Attendance Corrections", description = "Attendance correction request workflow")
public class AttendanceCorrectionController {

    private final AttendanceCorrectionService correctionService;

    @PostMapping
    @Operation(summary = "Submit an attendance correction request")
    public ResponseEntity<ApiResponse<AttendanceCorrectionResponse>> submit(
            @Valid @RequestBody AttendanceCorrectionRequest request) {
        AttendanceCorrectionResponse response = correctionService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    @Operation(summary = "List correction requests, optionally filtered by status")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> list(
            @RequestParam(value = "status", required = false) CorrectionStatus status) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.listByStatus(status)));
    }

    @GetMapping("/teacher/{teacherId}")
    @Operation(summary = "List correction requests submitted by a teacher")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> listByTeacher(
            @PathVariable("teacherId") UUID teacherId) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.listByTeacher(teacherId)));
    }

    @PatchMapping("/{id}/approve")
    @Operation(summary = "Approve a correction request")
    public ResponseEntity<ApiResponse<AttendanceCorrectionResponse>> approve(
            @PathVariable("id") UUID id,
            @Valid @RequestBody AttendanceCorrectionReviewRequest review) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.approve(id, review)));
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Reject a correction request")
    public ResponseEntity<ApiResponse<AttendanceCorrectionResponse>> reject(
            @PathVariable("id") UUID id,
            @Valid @RequestBody AttendanceCorrectionReviewRequest review) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.reject(id, review)));
    }
}
