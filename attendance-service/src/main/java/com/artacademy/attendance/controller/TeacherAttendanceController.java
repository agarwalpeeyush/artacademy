package com.artacademy.attendance.controller;

import com.artacademy.attendance.dto.TeacherAttendanceRequest;
import com.artacademy.attendance.dto.TeacherAttendanceResponse;
import com.artacademy.attendance.dto.TeacherRangeAttendanceRequest;
import com.artacademy.attendance.service.TeacherAttendanceService;
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
@RequestMapping("/attendance/teachers")
@RequiredArgsConstructor
@Tag(name = "Teacher Attendance", description = "Teacher attendance management API")
public class TeacherAttendanceController {

    private final TeacherAttendanceService teacherAttendanceService;

    @PostMapping
    @Operation(summary = "Mark or update teacher attendance (upsert)")
    public ResponseEntity<ApiResponse<TeacherAttendanceResponse>> markAttendance(
            @Valid @RequestBody TeacherAttendanceRequest request) {
        TeacherAttendanceResponse response = teacherAttendanceService.markAttendance(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/class/{classId}/bulk-range")
    @Operation(summary = "Bulk-mark teacher attendance for a class across scheduled session days in a date range")
    public ResponseEntity<ApiResponse<List<TeacherAttendanceResponse>>> markClassAttendanceForRange(
            @PathVariable("classId") UUID classId,
            @Valid @RequestBody TeacherRangeAttendanceRequest request) {
        List<TeacherAttendanceResponse> response =
                teacherAttendanceService.markClassAttendanceForRange(classId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/class/{classId}/date")
    @Operation(summary = "List teacher attendance rows for a class on a specific date")
    public ResponseEntity<ApiResponse<List<TeacherAttendanceResponse>>> getByClassAndDate(
            @PathVariable("classId") UUID classId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<TeacherAttendanceResponse> records =
                teacherAttendanceService.getByClassAndDate(classId, date);
        return ResponseEntity.ok(ApiResponse.success(records));
    }

    @GetMapping("/{teacherId}")
    @Operation(summary = "Get teacher attendance records, with optional date range filter")
    public ResponseEntity<ApiResponse<List<TeacherAttendanceResponse>>> getByTeacher(
            @PathVariable("teacherId") UUID teacherId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<TeacherAttendanceResponse> records =
                teacherAttendanceService.getByTeacher(teacherId, from, to);
        return ResponseEntity.ok(ApiResponse.success(records));
    }
}
