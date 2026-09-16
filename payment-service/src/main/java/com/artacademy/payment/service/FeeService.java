package com.artacademy.payment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.payment.client.EnrollmentServiceClient;
import com.artacademy.payment.domain.FeeBill;
import com.artacademy.payment.domain.FeeStatus;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.dto.FeeBillResponse;
import com.artacademy.payment.dto.FeeBillUpdateRequest;
import com.artacademy.payment.dto.FeeDetailDto;
import com.artacademy.payment.dto.FeeDetailUpdateRequest;
import com.artacademy.payment.dto.ScopedStudent;
import com.artacademy.payment.dto.TeacherRevenueSummary;
import com.artacademy.payment.mapper.PaymentMapper;
import com.artacademy.payment.repository.FeeBillRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Fee-catalogue and bill administration (§4, §8, §9). Reads/edits {@link StudentFeeDetail} lines,
 * reads {@link FeeBill}s, applies the principal's bill edit and revenue-share override, and rolls
 * up per-teacher revenue over PAID bills using effective (override-aware) shares.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final StudentFeeDetailRepository feeDetailRepository;
    private final FeeBillRepository feeBillRepository;
    private final EnrollmentServiceClient enrollmentServiceClient;
    private final PaymentMapper paymentMapper;
    private final Clock clock;

    /** Allowed drift between (institute + teacher) and the billed amount on an override. */
    @Value("${payment.share.override-tolerance:10}")
    private BigDecimal overrideTolerance;

    // --- Scoped student picker ---

    @Transactional(readOnly = true)
    public List<ScopedStudent> getStudents(UUID teacherId) {
        return enrollmentServiceClient.fetchScopedStudents(teacherId);
    }

    // --- Fee catalogue lines ---

    @Transactional(readOnly = true)
    public List<FeeDetailDto> getDetailsByEnrollment(UUID enrollmentId) {
        return feeDetailRepository.findByEnrollmentId(enrollmentId).stream()
                .map(paymentMapper::toDetailDto)
                .collect(Collectors.toList());
    }

    /** Edit an unbilled catalogue line (amount / due date / share rule). */
    @Transactional
    public FeeDetailDto updateDetail(UUID detailId, FeeDetailUpdateRequest request) {
        StudentFeeDetail detail = feeDetailRepository.findById(detailId)
                .orElseThrow(() -> ApiException.notFound("Fee detail not found with id: " + detailId));

        detail.setAmount(request.getAmount());
        detail.setDueDate(request.getDueDate());
        detail.setInstituteShareType(request.getInstituteShareType());
        detail.setInstituteShareValue(request.getInstituteShareValue());
        feeDetailRepository.save(detail);
        log.info("Updated fee detail id={} (amount={})", detailId, request.getAmount());
        return paymentMapper.toDetailDto(detail);
    }

    // --- Bills ---

    @Transactional(readOnly = true)
    public List<FeeBillResponse> getBillsByStudent(UUID studentId) {
        return feeBillRepository.findByStudentId(studentId).stream()
                .map(this::decorate)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FeeBillResponse getBill(UUID billId) {
        return decorate(loadBill(billId));
    }

    /**
     * Principal edit of a bill: amount / due date / status, plus an optional revenue-share
     * override. When both override shares are present they are validated (each ≥ 0 and
     * |institute + teacher − billed| ≤ tolerance) and stamped with who/when.
     */
    @Transactional
    public FeeBillResponse updateBill(UUID billId, FeeBillUpdateRequest request) {
        FeeBill bill = loadBill(billId);

        if (request.getAmountDue() != null) {
            bill.setAmountDue(request.getAmountDue());
            bill.setOutstandingAmount(request.getAmountDue().subtract(nz(bill.getPaidAmount()))
                    .max(BigDecimal.ZERO));
        }
        if (request.getDueDate() != null) {
            bill.setDueDate(request.getDueDate());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            FeeStatus status = FeeStatus.valueOf(request.getStatus());
            bill.setStatus(status);
            bill.setOutstandingBill(status != FeeStatus.PAID);
        }

        if (request.getInstituteShare() != null || request.getTeacherShare() != null) {
            applyOverride(bill, request);
        }

        feeBillRepository.save(bill);
        log.info("Updated bill id={} (status={}, amountDue={})",
                billId, bill.getStatus(), bill.getAmountDue());
        return decorate(bill);
    }

    private void applyOverride(FeeBill bill, FeeBillUpdateRequest request) {
        BigDecimal institute = request.getInstituteShare();
        BigDecimal teacher = request.getTeacherShare();
        if (institute == null || teacher == null) {
            throw ApiException.badRequest("Both institute and teacher share are required to override");
        }
        if (institute.signum() < 0 || teacher.signum() < 0) {
            throw ApiException.badRequest("Override shares must be non-negative");
        }
        BigDecimal billed = nz(bill.getPaidAmount());
        BigDecimal drift = institute.add(teacher).subtract(billed).abs();
        if (drift.compareTo(overrideTolerance) > 0) {
            throw ApiException.badRequest("Override institute + teacher share (" + institute.add(teacher)
                    + ") must be within " + overrideTolerance + " of the paid amount (" + billed + ")");
        }
        bill.setOverrideInstituteShare(institute);
        bill.setOverrideTeacherShare(teacher);
        bill.setOverriddenBy(request.getOverriddenBy());
        bill.setOverriddenAt(LocalDateTime.now(clock));
        log.info("Principal {} overrode share on billId={} (institute={}, teacher={})",
                request.getOverriddenBy(), bill.getId(), institute, teacher);
    }

    // --- Teacher revenue rollups (F9) ---

    @Transactional(readOnly = true)
    public List<TeacherRevenueSummary> getTeacherSummaries() {
        Map<UUID, long[]> counts = new HashMap<>();
        Map<UUID, BigDecimal[]> sums = new LinkedHashMap<>();

        for (FeeBill bill : paidBillsWithTeacher()) {
            UUID teacherId = bill.getTeacherId();
            counts.computeIfAbsent(teacherId, k -> new long[1])[0]++;
            BigDecimal[] agg = sums.computeIfAbsent(teacherId,
                    k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            agg[0] = agg[0].add(nz(bill.getPaidAmount()));
            agg[1] = agg[1].add(ShareResolver.effectiveInstitute(bill));
            agg[2] = agg[2].add(ShareResolver.effectiveTeacher(bill));
        }

        return sums.entrySet().stream()
                .map(e -> TeacherRevenueSummary.builder()
                        .teacherId(e.getKey())
                        .collected(e.getValue()[0])
                        .instituteShare(e.getValue()[1])
                        .teacherShare(e.getValue()[2])
                        .paidDetailCount(counts.get(e.getKey())[0])
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeacherRevenueSummary getTeacherSummary(UUID teacherId) {
        return getTeacherSummaries().stream()
                .filter(s -> teacherId.equals(s.getTeacherId()))
                .findFirst()
                .orElse(TeacherRevenueSummary.builder()
                        .teacherId(teacherId)
                        .collected(BigDecimal.ZERO)
                        .instituteShare(BigDecimal.ZERO)
                        .teacherShare(BigDecimal.ZERO)
                        .paidDetailCount(0)
                        .build());
    }

    private List<FeeBill> paidBillsWithTeacher() {
        return feeBillRepository.findByStatusIn(List.of(FeeStatus.PAID)).stream()
                .filter(b -> b.getTeacherId() != null)
                .collect(Collectors.toList());
    }

    private FeeBill loadBill(UUID billId) {
        return feeBillRepository.findById(billId)
                .orElseThrow(() -> ApiException.notFound("Fee bill not found with id: " + billId));
    }

    private FeeBillResponse decorate(FeeBill bill) {
        return BillDecorator.decorate(bill, paymentMapper, clock);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
