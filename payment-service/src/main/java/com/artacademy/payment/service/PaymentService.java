package com.artacademy.payment.service;

import com.artacademy.common.events.FeeStatusUpdatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.PaymentReceivedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.payment.domain.FeeBill;
import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.FeeType;
import com.artacademy.payment.domain.Payment;
import com.artacademy.payment.domain.StudentCredit;
import com.artacademy.payment.dto.PaymentRequest;
import com.artacademy.payment.dto.PaymentResponse;
import com.artacademy.payment.mapper.PaymentMapper;
import com.artacademy.payment.repository.FeeBillRepository;
import com.artacademy.payment.repository.PaymentRepository;
import com.artacademy.payment.repository.StudentCreditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Student-level payments (§5). A single tendered amount, plus any carried credit, settles the
 * student's outstanding bills in a fixed waterfall — ADMISSION → MONTHLY (oldest first) → EXAM →
 * ONE_TIME_SHORT_TERM. Over-payment lands in {@link StudentCredit}. A bill that flips to PAID
 * stamps its payment date and resolves the institute/teacher share.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final FeeBillRepository feeBillRepository;
    private final StudentCreditRepository studentCreditRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final PaymentMapper paymentMapper;
    private final Clock clock;

    @Transactional
    public PaymentResponse recordPayment(PaymentRequest request) {
        log.info("Recording student-level payment: studentId={}, amount={}",
                request.getStudentId(), request.getAmount());

        LocalDateTime paymentDate = request.getPaymentDate().atStartOfDay();

        // 1. Persist the payment (total tendered).
        Payment payment = Payment.builder()
                .studentId(request.getStudentId())
                .amount(request.getAmount())
                .paymentMode(request.getPaymentMode())
                .transactionReference(request.getTransactionReference())
                .paymentDate(paymentDate)
                .remarks(request.getRemarks())
                .build();
        payment = paymentRepository.save(payment);

        // 2. remaining = carried credit + tendered amount.
        StudentCredit credit = studentCreditRepository.findById(request.getStudentId())
                .orElse(StudentCredit.builder()
                        .studentId(request.getStudentId())
                        .balance(BigDecimal.ZERO)
                        .build());
        BigDecimal remaining = nz(credit.getBalance()).add(request.getAmount());

        // 3. Outstanding bills in waterfall order.
        List<FeeBill> outstanding = feeBillRepository
                .findByStudentIdAndOutstandingBillTrue(request.getStudentId()).stream()
                .sorted(WATERFALL)
                .collect(Collectors.toList());

        // 4. Settle.
        List<UUID> settledBillIds = new java.util.ArrayList<>();
        for (FeeBill bill : outstanding) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal billOutstanding = nz(bill.getOutstandingAmount());
            if (billOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal applied = remaining.min(billOutstanding);

            bill.setPaidAmount(nz(bill.getPaidAmount()).add(applied));
            bill.setOutstandingAmount(billOutstanding.subtract(applied));
            bill.setPaymentDate(paymentDate);

            if (bill.getOutstandingAmount().compareTo(BigDecimal.ZERO) == 0) {
                bill.setStatus(FeeStatus.PAID);
                bill.setOutstandingBill(Boolean.FALSE);
                BigDecimal institute = ShareResolver.institute(
                        bill.getInstituteShareType(), bill.getInstituteShareValue(), bill.getPaidAmount());
                bill.setInstituteShareAmount(institute);
                bill.setTeacherShareAmount(ShareResolver.teacher(bill.getPaidAmount(), institute));
            } else {
                bill.setStatus(FeeStatus.PARTIAL);
            }
            feeBillRepository.save(bill);
            settledBillIds.add(bill.getId());

            remaining = remaining.subtract(applied);
            publishSettlement(payment.getId(), bill);
        }

        // 5. Leftover → credit.
        credit.setBalance(remaining.max(BigDecimal.ZERO));
        credit.setUpdatedAt(LocalDateTime.now(clock));
        studentCreditRepository.save(credit);

        log.info("Payment {} settled {} bill(s); credit balance now {}",
                payment.getId(), settledBillIds.size(), credit.getBalance());

        PaymentResponse response = paymentMapper.toPaymentResponse(payment);
        response.setSettledBillIds(settledBillIds);
        response.setCreditBalance(credit.getBalance());
        return response;
    }

    /** Publishes the per-bill payment + status events (bill id reuses the {@code feeCycleId} field). */
    private void publishSettlement(UUID paymentId, FeeBill bill) {
        PaymentReceivedEvent paymentEvent = PaymentReceivedEvent.builder()
                .paymentId(paymentId)
                .feeCycleId(bill.getId())
                .studentId(bill.getStudentId())
                .amount(bill.getPaidAmount())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.PAYMENT_RECEIVED, bill.getStudentId().toString(), paymentEvent);

        FeeStatusUpdatedEvent statusEvent = FeeStatusUpdatedEvent.builder()
                .feeCycleId(bill.getId())
                .studentId(bill.getStudentId())
                .status(bill.getStatus().name())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.FEE_STATUS_UPDATED, bill.getStudentId().toString(), statusEvent);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(UUID studentId) {
        return paymentRepository.findByStudentId(studentId).stream()
                .map(paymentMapper::toPaymentResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID paymentId) {
        return paymentMapper.toPaymentResponse(loadPayment(paymentId));
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
                .map(paymentMapper::toPaymentResponse)
                .collect(Collectors.toList());
    }

    /** Loads a payment for receipt generation. */
    @Transactional(readOnly = true)
    public Payment loadPayment(UUID paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> ApiException.notFound("Payment not found with id: " + paymentId));
    }

    /**
     * The bills a payment touched, for the receipt. Payments aren't persisted against bills, so we
     * approximate: the student's bills stamped with this payment's date. Good enough for a receipt.
     */
    @Transactional(readOnly = true)
    public List<FeeBill> billsSettledBy(Payment payment) {
        return feeBillRepository.findByStudentId(payment.getStudentId()).stream()
                .filter(b -> payment.getPaymentDate() != null
                        && payment.getPaymentDate().equals(b.getPaymentDate()))
                .sorted(WATERFALL)
                .collect(Collectors.toList());
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /** ADMISSION → MONTHLY (oldest year, then month) → EXAM → ONE_TIME_SHORT_TERM. */
    private static final Comparator<FeeBill> WATERFALL = Comparator
            .comparingInt((FeeBill b) -> waterfallRank(b.getFeeType()))
            .thenComparingInt(b -> b.getBillingYear() != null ? b.getBillingYear() : 0)
            .thenComparingInt(b -> b.getBillingMonth() != null ? b.getBillingMonth() : 0)
            .thenComparing(FeeBill::getGeneratedDate, Comparator.nullsFirst(Comparator.naturalOrder()));

    private static int waterfallRank(FeeType type) {
        return switch (type) {
            case ADMISSION -> 0;
            case MONTHLY -> 1;
            case EXAM -> 2;
            case ONE_TIME_SHORT_TERM -> 3;
        };
    }
}
