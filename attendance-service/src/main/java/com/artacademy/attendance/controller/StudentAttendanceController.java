package com.artacademy.attendance.controller;

import com.artacademy.attendance.dto.StudentAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceResponse;
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
}
