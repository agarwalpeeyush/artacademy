package com.artacademy.payment.service;

import com.artacademy.common.events.FeeStatusUpdatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.PaymentReceivedEvent;
import com.artacademy.common.events.AdmissionFeePaidEvent;
import com.artacademy.payment.domain.*;
import com.artacademy.payment.dto.PaymentRequest;
import com.artacademy.payment.dto.PaymentResponse;
import com.artacademy.payment.mapper.PaymentMapper;
import com.artacademy.payment.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final StudentFeeCycleRepository feeCycleRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final PaymentAllocationRepository paymentAllocationRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final PaymentMapper paymentMapper;

    @Transactional
    public PaymentResponse recordPayment(PaymentRequest request) {
        log.info("Recording payment for feeCycleId={}, studentId={}, amount={}",
                request.getFeeCycleId(), request.getStudentId(), request.getAmount());

        // 1. Fetch fee cycle
        StudentFeeCycle cycle = feeCycleRepository.findById(request.getFeeCycleId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Fee cycle not found with id: " + request.getFeeCycleId()));

        // 2. Create Payment record
        LocalDateTime paymentDate = request.getPaymentDate() != null
                ? request.getPaymentDate().atStartOfDay()
                : LocalDateTime.now();
        Payment payment = Payment.builder()
                .feeCycle(cycle)
                .studentId(request.getStudentId())
                .amount(request.getAmount())
                .paymentMode(request.getPaymentMode())
                .transactionReference(request.getTransactionReference())
                .paymentDate(paymentDate)
                .remarks(request.getRemarks())
                .build();

        payment = paymentRepository.save(payment);

        // 3. Fetch all fee details for this cycle, sorted FIFO by courseId (ascending)
        List<StudentFeeDetail> details = feeDetailRepository.findByFeeCycle_Id(cycle.getId()).stream()
                .filter(d -> d.getStatus() != FeeStatus.PAID)
                .sorted(Comparator.comparing(StudentFeeDetail::getCourseId))
                .collect(Collectors.toList());

        // 4. Allocate payment proportionally using FIFO
        BigDecimal remaining = request.getAmount();
        List<PaymentAllocation> allocations = new ArrayList<>();

        for (StudentFeeDetail detail : details) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal detailOutstanding = detail.getOutstandingAmount();
            BigDecimal allocationAmount = remaining.min(detailOutstanding);

            PaymentAllocation allocation = PaymentAllocation.builder()
                    .payment(payment)
                    .feeDetail(detail)
                    .allocatedAmount(allocationAmount)
                    .build();
            allocations.add(allocation);

            // 5. Update StudentFeeDetail
            detail.setAllocatedPaidAmount(detail.getAllocatedPaidAmount().add(allocationAmount));
            detail.setOutstandingAmount(detail.getOutstandingAmount().subtract(allocationAmount));

            if (detail.getOutstandingAmount().compareTo(BigDecimal.ZERO) == 0) {
                detail.setStatus(FeeStatus.PAID);
            } else {
                detail.setStatus(FeeStatus.PARTIAL);
            }
            feeDetailRepository.save(detail);

            remaining = remaining.subtract(allocationAmount);
        }

        paymentAllocationRepository.saveAll(allocations);
        payment.setAllocations(allocations);

        // 5. Validate SUM(allocations) == payment.amount
        BigDecimal allocatedSum = allocations.stream()
                .map(PaymentAllocation::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (allocatedSum.compareTo(request.getAmount()) != 0) {
            log.warn("Allocation mismatch: requested={}, allocated={}. Possible overpayment or all details settled.",
                    request.getAmount(), allocatedSum);
        }

        // 6. Update StudentFeeCycle: recalculate from all details
        List<StudentFeeDetail> allDetails = feeDetailRepository.findByFeeCycle_Id(cycle.getId());
        BigDecimal totalPaid = allDetails.stream()
                .map(StudentFeeDetail::getAllocatedPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        cycle.setPaidAmount(totalPaid);
        cycle.setOutstandingAmount(cycle.getTotalAmount().subtract(totalPaid));

        boolean allPaid = allDetails.stream().allMatch(d -> d.getStatus() == FeeStatus.PAID);
        boolean anyPaid = allDetails.stream().anyMatch(d -> d.getStatus() != FeeStatus.UNPAID);

        if (allPaid) {
            cycle.setStatus(FeeStatus.PAID);
        } else if (anyPaid || totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            cycle.setStatus(FeeStatus.PARTIAL);
        } else {
            cycle.setStatus(FeeStatus.UNPAID);
        }

        feeCycleRepository.save(cycle);

        // 7. Publish PaymentReceivedEvent
        PaymentReceivedEvent paymentEvent = PaymentReceivedEvent.builder()
                .paymentId(payment.getId())
                .feeCycleId(cycle.getId())
                .studentId(request.getStudentId())
                .amount(request.getAmount())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.PAYMENT_RECEIVED,
                request.getStudentId().toString(), paymentEvent);

        // 8. Publish FeeStatusUpdatedEvent
        FeeStatusUpdatedEvent statusEvent = FeeStatusUpdatedEvent.builder()
                .feeCycleId(cycle.getId())
                .studentId(request.getStudentId())
                .status(cycle.getStatus().name())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.FEE_STATUS_UPDATED,
                request.getStudentId().toString(), statusEvent);

        // 9. When an ADMISSION cycle is fully settled, notify course-enrollment-service so it
        // can flip Enrollment.admissionFeePaid = true.
        if (cycle.getCycleKind() == FeeCycleKind.ADMISSION && cycle.getStatus() == FeeStatus.PAID) {
            allDetails.stream().findFirst().ifPresent(detail -> {
                AdmissionFeePaidEvent admissionEvent = AdmissionFeePaidEvent.builder()
                        .enrollmentId(detail.getEnrollmentId())
                        .studentId(request.getStudentId())
                        .feeCycleId(cycle.getId())
                        .occurredAt(Instant.now())
                        .build();
                kafkaTemplate.send(KafkaTopics.ADMISSION_FEE_PAID,
                        detail.getEnrollmentId().toString(), admissionEvent);
                log.info("Published AdmissionFeePaidEvent for enrollmentId={}, cycleId={}",
                        detail.getEnrollmentId(), cycle.getId());
            });
        }

        log.info("Payment recorded: paymentId={}, cycleId={}, cycleStatus={}",
                payment.getId(), cycle.getId(), cycle.getStatus());

        return paymentMapper.toPaymentResponseWithAllocations(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(UUID studentId) {
        return paymentRepository.findByStudentId(studentId).stream()
                .map(p -> {
                    List<PaymentAllocation> allocs = paymentAllocationRepository.findByPayment_Id(p.getId());
                    p.setAllocations(allocs);
                    return paymentMapper.toPaymentResponseWithAllocations(p);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID paymentId) {
        Payment payment = loadPaymentWithAllocations(paymentId);
        return paymentMapper.toPaymentResponseWithAllocations(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByFeeCycle(UUID feeCycleId) {
        return paymentRepository.findByFeeCycle_Id(feeCycleId).stream()
                .map(p -> {
                    p.setAllocations(paymentAllocationRepository.findByPayment_Id(p.getId()));
                    return paymentMapper.toPaymentResponseWithAllocations(p);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getAllPayments(LocalDate startDate, LocalDate endDate) {
        List<Payment> payments;
        if (startDate != null && endDate != null) {
            payments = paymentRepository.findByPaymentDateBetween(
                    startDate.atStartOfDay(), endDate.plusDays(1).atStartOfDay());
        } else {
            payments = paymentRepository.findAll();
        }
        return payments.stream()
                .map(p -> {
                    p.setAllocations(paymentAllocationRepository.findByPayment_Id(p.getId()));
                    return paymentMapper.toPaymentResponseWithAllocations(p);
                })
                .collect(Collectors.toList());
    }

    /** Loads a payment together with its allocations (used for receipt generation). */
    @Transactional(readOnly = true)
    public Payment loadPaymentWithAllocations(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Payment not found with id: " + paymentId));
        payment.setAllocations(paymentAllocationRepository.findByPayment_Id(payment.getId()));
        return payment;
    }
}
