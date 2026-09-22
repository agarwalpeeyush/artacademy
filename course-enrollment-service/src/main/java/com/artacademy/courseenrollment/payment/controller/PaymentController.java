package com.artacademy.courseenrollment.payment.controller;

import com.artacademy.courseenrollment.payment.domain.FeeBill;
import com.artacademy.courseenrollment.payment.domain.Payment;
import com.artacademy.courseenrollment.payment.dto.PaymentRequest;
import com.artacademy.courseenrollment.payment.dto.PaymentResponse;
import com.artacademy.courseenrollment.payment.service.PaymentService;
import com.artacademy.courseenrollment.payment.service.ReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "APIs for recording and retrieving student payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final ReceiptService receiptService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Record a student-level payment (settled against outstanding bills)")
    public ResponseEntity<PaymentResponse> recordPayment(
            @Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.recordPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get all payments, optionally filtered by date range")
    public ResponseEntity<List<PaymentResponse>> getAllPayments(
            @RequestParam(value = "startDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(paymentService.getAllPayments(startDate, endDate));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Get all payments for a student")
    public ResponseEntity<List<PaymentResponse>> getPayments(@PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(paymentService.getPayments(studentId));
    }

    @GetMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Get a single payment by id")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable("paymentId") UUID paymentId) {
        return ResponseEntity.ok(paymentService.getPaymentById(paymentId));
    }

    @GetMapping("/{paymentId}/receipt")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Download a PDF receipt for a payment")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable("paymentId") UUID paymentId) {
        Payment payment = paymentService.loadPayment(paymentId);
        List<FeeBill> settled = paymentService.billsSettledBy(payment);
        byte[] pdf = receiptService.generateReceipt(payment, settled);
        String filename = "receipt-" + paymentId + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
