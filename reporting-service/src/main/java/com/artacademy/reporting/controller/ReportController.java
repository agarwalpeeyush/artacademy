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
     * GET /reports/attendance?subjectType=STUDENT&startDate=2026-09-01&endDate=2026-09-30
     * Returns attendance summaries for the given subjectType. When startDate and endDate are
     * provided, aggregates over the covered month span; otherwise optionally filters by month/year.
     */
    @GetMapping("/attendance")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get attendance report by subject type (STUDENT/TEACHER), by month/year or a date range")
    public ResponseEntity<List<AttendanceSummaryResponse>> getAttendanceReport(
            @RequestParam String subjectType,
            @RequestParam Optional<Integer> month,
            @RequestParam Optional<Integer> year,
            @RequestParam Optional<String> startDate,
            @RequestParam Optional<String> endDate) {

        List<AttendanceSummaryResponse> result =
                reportingService.getAttendanceReport(subjectType, month, year, startDate, endDate);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /reports/attendance/exceptions?threshold=75&type=STUDENT&month=9&year=2026
     * Returns subjects with attendance below the threshold percentage.
     */
    @GetMapping("/attendance/exceptions")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "List subjects with attendance below a threshold percentage")
    public ResponseEntity<List<AttendanceExceptionResponse>> getAttendanceExceptions(
            @RequestParam(defaultValue = "75") double threshold,
            @RequestParam(name = "type", required = false) String subjectType,
            @RequestParam Optional<Integer> month,
            @RequestParam Optional<Integer> year) {

        return ResponseEntity.ok(
                reportingService.getAttendanceExceptions(threshold, subjectType, month, year));
    }

    /**
     * GET /reports/attendance/monthly?month=9&year=2026
     * Returns student attendance summaries grouped by course.
     */
    @GetMapping("/attendance/monthly")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Monthly attendance summary grouped by course")
    public ResponseEntity<List<CourseAttendanceSummaryResponse>> getMonthlyCourseSummary(
            @RequestParam Integer month,
            @RequestParam Integer year) {

        return ResponseEntity.ok(reportingService.getMonthlyCourseSummary(month, year));
    }

    /**
     * GET /reports/attendance/export?subjectType=STUDENT&month=9&year=2026
     * Returns the attendance report as a downloadable CSV file.
     */
    @GetMapping(value = "/attendance/export", produces = "text/csv")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Export attendance report as CSV")
    public ResponseEntity<String> exportAttendanceCsv(
            @RequestParam String subjectType,
            @RequestParam Optional<Integer> month,
            @RequestParam Optional<Integer> year) {

        String csv = reportingService.exportAttendanceCsv(subjectType, month, year);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=attendance-report.csv")
                .header("Content-Type", "text/csv")
                .body(csv);
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
