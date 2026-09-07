package com.artacademy.payment.controller;

import com.artacademy.payment.dto.FeeCycleResponse;
import com.artacademy.payment.dto.FeeDetailResponse;
import com.artacademy.payment.dto.GenerateFeesRequest;
import com.artacademy.payment.dto.RevenueSummaryResponse;
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
@Tag(name = "Fee Management", description = "APIs for managing student fee cycles")
public class FeeController {

    private final FeeService feeService;

    @PostMapping("/generate")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Generate monthly fees for all active students")
    public ResponseEntity<List<FeeCycleResponse>> generateFees(
            @Valid @RequestBody GenerateFeesRequest request) {
        List<FeeCycleResponse> cycles = feeService.generateMonthlyFees(
                request.getBillingMonth(), request.getBillingYear());
        return ResponseEntity.status(HttpStatus.CREATED).body(cycles);
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get all fee cycles for a student")
    public ResponseEntity<List<FeeCycleResponse>> getFeeCycles(@PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(feeService.getFeeCycles(studentId));
    }

    @GetMapping("/student/{studentId}/courses")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get fee details (per course) for a student")
    public ResponseEntity<List<FeeDetailResponse>> getFeeDetails(@PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(feeService.getFeeDetails(studentId));
    }

    @GetMapping("/cycle/{feeCycleId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get a fee cycle with its details")
    public ResponseEntity<FeeCycleResponse> getFeeCycleDetails(@PathVariable("feeCycleId") UUID feeCycleId) {
        return ResponseEntity.ok(feeService.getFeeCycleDetails(feeCycleId));
    }

    @GetMapping("/outstanding/{studentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get outstanding (UNPAID or PARTIAL) fee cycles for a student")
    public ResponseEntity<List<FeeCycleResponse>> getOutstanding(@PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(feeService.getOutstanding(studentId));
    }

    @GetMapping("/defaulters")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get all students with outstanding fees (defaulters)")
    public ResponseEntity<List<FeeCycleResponse>> getDefaulters() {
        return ResponseEntity.ok(feeService.getDefaulters());
    }

    @GetMapping("/revenue-summary")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get revenue summary grouped by billing year and month")
    public ResponseEntity<List<RevenueSummaryResponse>> getRevenueSummary() {
        return ResponseEntity.ok(feeService.getRevenueSummary());
    }
}
