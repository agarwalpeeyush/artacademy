package com.artacademy.payment.controller;

import com.artacademy.payment.domain.FeeBill;
import com.artacademy.payment.dto.FeeBillResponse;
import com.artacademy.payment.dto.FeeBillUpdateRequest;
import com.artacademy.payment.dto.FeeDetailDto;
import com.artacademy.payment.dto.FeeDetailUpdateRequest;
import com.artacademy.payment.dto.FeeGenerateResponse;
import com.artacademy.payment.dto.ScopedStudent;
import com.artacademy.payment.dto.TeacherRevenueSummary;
import com.artacademy.payment.service.BillGenerationService;
import com.artacademy.payment.service.FeeService;
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
@RequestMapping("/fees")
@RequiredArgsConstructor
@Tag(name = "Fee Management", description = "Fee catalogue, bill generation, and revenue rollups")
public class FeeController {

    private final FeeService feeService;
    private final BillGenerationService billGenerationService;

    // --- Scoped picker ---

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Name-resolved students for the fee picker (optionally scoped to a teacher)")
    public ResponseEntity<List<ScopedStudent>> getStudents(
            @RequestParam(value = "teacherId", required = false) UUID teacherId) {
        return ResponseEntity.ok(feeService.getStudents(teacherId));
    }

    // --- Fee catalogue lines ---

    @GetMapping("/detail/enrollment/{enrollmentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Fee catalogue lines for an enrollment")
    public ResponseEntity<List<FeeDetailDto>> getDetails(@PathVariable("enrollmentId") UUID enrollmentId) {
        return ResponseEntity.ok(feeService.getDetailsByEnrollment(enrollmentId));
    }

    @PutMapping("/detail/{id}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Edit an unbilled fee catalogue line")
    public ResponseEntity<FeeDetailDto> updateDetail(
            @PathVariable("id") UUID id,
            @Valid @RequestBody FeeDetailUpdateRequest request) {
        return ResponseEntity.ok(feeService.updateDetail(id, request));
    }

    // --- Bill generation ---

    @PostMapping("/generate/{enrollmentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Generate bills for an enrollment (current month + optional missing back-fill)")
    public ResponseEntity<FeeGenerateResponse> generate(
            @PathVariable("enrollmentId") UUID enrollmentId,
            @RequestParam(value = "generateMissing", defaultValue = "false") boolean generateMissing) {
        FeeGenerateResponse response = billGenerationService.generateOnEnroll(enrollmentId, generateMissing);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/generate/exam")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Batch-bill the EXAM cohort of a course")
    public ResponseEntity<List<FeeBillResponse>> generateExam(@RequestParam("courseId") UUID courseId) {
        List<FeeBill> bills = billGenerationService.generateExamBills(courseId);
        List<FeeBillResponse> response = bills.stream()
                .map(b -> feeService.getBill(b.getId()))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // --- Bills ---

    @GetMapping("/bills/student/{studentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "All bills for a student")
    public ResponseEntity<List<FeeBillResponse>> getBills(@PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(feeService.getBillsByStudent(studentId));
    }

    @PutMapping("/bill/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Principal edit of a bill (amount / due / status / share override)")
    public ResponseEntity<FeeBillResponse> updateBill(
            @PathVariable("id") UUID id,
            @Valid @RequestBody FeeBillUpdateRequest request) {
        return ResponseEntity.ok(feeService.updateBill(id, request));
    }

    // --- Revenue rollups ---

    @GetMapping("/teachers/summary")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Per-teacher revenue rollup")
    public ResponseEntity<List<TeacherRevenueSummary>> getTeacherSummaries() {
        return ResponseEntity.ok(feeService.getTeacherSummaries());
    }

    @GetMapping("/teacher/{teacherId}/summary")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Revenue rollup for a single teacher")
    public ResponseEntity<TeacherRevenueSummary> getTeacherSummary(@PathVariable("teacherId") UUID teacherId) {
        return ResponseEntity.ok(feeService.getTeacherSummary(teacherId));
    }
}
