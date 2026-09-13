package com.artacademy.attendance.controller;

import com.artacademy.attendance.dto.AttendanceCorrectionResponse;
import com.artacademy.attendance.dto.AttendanceEditRequest;
import com.artacademy.attendance.service.AttendanceCorrectionService;
import com.artacademy.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/attendance/corrections")
@RequiredArgsConstructor
@Tag(name = "Attendance Corrections", description = "Direct attendance edits with audit trail (R16)")
public class AttendanceCorrectionController {

    private final AttendanceCorrectionService correctionService;

    @PostMapping("/students")
    @Operation(summary = "Directly edit student attendance records (teacher or principal); appends audit rows")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> editStudents(
            @Valid @RequestBody AttendanceEditRequest request) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.editStudentAttendance(request)));
    }

    @PostMapping("/teachers")
    @Operation(summary = "Directly edit teacher attendance records (principal); appends audit rows")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> editTeachers(
            @Valid @RequestBody AttendanceEditRequest request) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.editTeacherAttendance(request)));
    }

    @GetMapping("/attendance/{attendanceId}")
    @Operation(summary = "List the edit audit trail for a single attendance record")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> auditForAttendance(
            @PathVariable("attendanceId") UUID attendanceId) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.auditForAttendance(attendanceId)));
    }

    @GetMapping("/subject/{subjectId}")
    @Operation(summary = "List the edit audit trail for a student or teacher")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> auditForSubject(
            @PathVariable("subjectId") UUID subjectId) {
        return ResponseEntity.ok(ApiResponse.success(correctionService.auditForSubject(subjectId)));
    }
}
