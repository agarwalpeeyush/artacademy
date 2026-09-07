package com.artacademy.reporting.controller;

import com.artacademy.reporting.dto.*;
import com.artacademy.reporting.service.ReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Read-optimised reporting endpoints")
public class ReportController {

    private final ReportingService reportingService;

    /**
     * GET /reports/attendance?subjectType=STUDENT&month=9&year=2026
     * Returns attendance summaries for the given subjectType, optionally filtered by month/year.
     */
    @GetMapping("/attendance")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get attendance report by subject type (STUDENT/TEACHER), optionally by month and year")
    public ResponseEntity<List<AttendanceSummaryResponse>> getAttendanceReport(
            @RequestParam String subjectType,
            @RequestParam Optional<Integer> month,
            @RequestParam Optional<Integer> year) {

        List<AttendanceSummaryResponse> result =
                reportingService.getAttendanceReport(subjectType, month, year);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /reports/revenue
     * Returns all revenue summaries ordered by year DESC, month DESC.
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get all revenue summaries ordered by year and month descending")
    public ResponseEntity<List<RevenueSummaryResponse>> getRevenueReport() {
        return ResponseEntity.ok(reportingService.getRevenueReport());
    }

    /**
     * GET /reports/students?page=0&size=20
     * Returns a paginated list of student reports.
     */
    @GetMapping("/students")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get paginated student reports")
    public ResponseEntity<Page<StudentReportResponse>> getStudentReports(
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(reportingService.getStudentReports(pageable));
    }

    /**
     * GET /reports/teachers
     * Returns all teacher reports.
     */
    @GetMapping("/teachers")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get all teacher reports")
    public ResponseEntity<List<TeacherReportResponse>> getTeacherReports() {
        return ResponseEntity.ok(reportingService.getTeacherReports());
    }

    /**
     * GET /reports/fees?month=9&year=2026
     * Returns the revenue summary for the given billing month and year.
     */
    @GetMapping("/fees")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get fee summary for a specific billing month and year")
    public ResponseEntity<RevenueSummaryResponse> getFeeReport(
            @RequestParam Integer month,
            @RequestParam Integer year) {

        return ResponseEntity.ok(reportingService.getFeeReport(month, year));
    }

    /**
     * GET /reports/defaulters
     * Returns students with an outstanding fee balance, sorted by balance descending.
     */
    @GetMapping("/defaulters")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get students with outstanding fee balances (defaulters)")
    public ResponseEntity<List<DefaulterResponse>> getDefaulters() {
        return ResponseEntity.ok(reportingService.getDefaulters());
    }
}
