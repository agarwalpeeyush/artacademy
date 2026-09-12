package com.artacademy.attendance.controller;

import com.artacademy.attendance.dto.ClassRangeAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceResponse;
import com.artacademy.attendance.dto.StudentAttendanceStatsResponse;
import com.artacademy.attendance.service.StudentAttendanceService;
import com.artacademy.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/attendance/students")
@RequiredArgsConstructor
@Tag(name = "Student Attendance", description = "Student attendance management API")
public class StudentAttendanceController {

    private final StudentAttendanceService studentAttendanceService;

    @PostMapping
    @Operation(summary = "Mark student attendance")
    public ResponseEntity<ApiResponse<StudentAttendanceResponse>> markAttendance(
            @Valid @RequestBody StudentAttendanceRequest request) {
        StudentAttendanceResponse response = studentAttendanceService.markAttendance(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/bulk")
    @Operation(summary = "Bulk upsert student attendance for a class session")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> markAttendanceBulk(
            @Valid @RequestBody List<StudentAttendanceRequest> requests) {
        List<StudentAttendanceResponse> response =
                studentAttendanceService.markAttendanceBulk(requests);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/class/{classId}/bulk-range")
    @Operation(summary = "Mark attendance for students across scheduled session days of a class in a date range")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> markClassAttendanceForRange(
            @PathVariable("classId") UUID classId,
            @Valid @RequestBody ClassRangeAttendanceRequest request) {
        List<StudentAttendanceResponse> response =
                studentAttendanceService.markClassAttendanceForRange(classId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a student attendance record")
    public ResponseEntity<ApiResponse<StudentAttendanceResponse>> updateAttendance(
            @PathVariable("id") UUID id,
            @Valid @RequestBody StudentAttendanceRequest request) {
        StudentAttendanceResponse response = studentAttendanceService.updateAttendance(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studentId}")
    @Operation(summary = "Get student attendance records, with optional date range filter")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> getByStudent(
            @PathVariable("studentId") UUID studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<StudentAttendanceResponse> records =
                studentAttendanceService.getByStudent(studentId, from, to);
        return ResponseEntity.ok(ApiResponse.success(records));
    }

    @GetMapping("/{studentId}/stats")
    @Operation(summary = "Get attendance stats for a student, optionally scoped to a class")
    public ResponseEntity<ApiResponse<StudentAttendanceStatsResponse>> getStats(
            @PathVariable("studentId") UUID studentId,
            @RequestParam(value = "classId", required = false) UUID classId) {
        StudentAttendanceStatsResponse stats = studentAttendanceService.getStats(studentId, classId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/class/{classId}/date")
    @Operation(summary = "List attendance records for a class on a specific date")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> getByClassAndDate(
            @PathVariable("classId") UUID classId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<StudentAttendanceResponse> records =
                studentAttendanceService.getByClassAndDate(classId, date);
        return ResponseEntity.ok(ApiResponse.success(records));
    }
}
