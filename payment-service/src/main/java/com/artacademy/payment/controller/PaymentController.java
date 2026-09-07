package com.artacademy.payment.controller;

import com.artacademy.payment.dto.PaymentRequest;
import com.artacademy.payment.dto.PaymentResponse;
import com.artacademy.payment.service.PaymentService;
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
@RequestMapping("/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "APIs for recording and retrieving student payments")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER')")
    @Operation(summary = "Record a payment against a student fee cycle")
    public ResponseEntity<PaymentResponse> recordPayment(
            @Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.recordPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('PRINCIPAL', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get all payments for a student")
    public ResponseEntity<List<PaymentResponse>> getPayments(@PathVariable("studentId") UUID studentId) {
        return ResponseEntity.ok(paymentService.getPayments(studentId));
    }
}
