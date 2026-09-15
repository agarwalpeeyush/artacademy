package com.artacademy.payment.service;

import com.artacademy.common.events.FeeGeneratedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.payment.domain.*;
import com.artacademy.payment.dto.FeeCycleResponse;
import com.artacademy.payment.dto.FeeDetailResponse;
import com.artacademy.payment.dto.RevenueSummaryResponse;
import com.artacademy.payment.dto.ShareOverrideRequest;
import com.artacademy.payment.dto.TeacherRevenueSummary;
import com.artacademy.payment.mapper.PaymentMapper;
import com.artacademy.payment.repository.EnrollmentCacheRepository;
import com.artacademy.payment.repository.StudentFeeCycleRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final StudentFeeCycleRepository feeCycleRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final EnrollmentCacheRepository enrollmentCacheRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final PaymentMapper paymentMapper;

    /** F12: allowed drift between (institute + teacher) and billed on an override. Default 10. */
    @Value("${payment.share.override-tolerance:10}")
    private BigDecimal overrideTolerance;

    @Transactional
    public List<FeeCycleResponse> generateMonthlyFees(int month, int year) {
        log.info("Generating monthly fees for {}/{}", month, year);

        List<EnrollmentCache> activeEnrollments = enrollmentCacheRepository.findByStatus("ACTIVE");
        if (activeEnrollments.isEmpty()) {
            log.warn("No active enrollments found for fee generation {}/{}", month, year);
            return Collections.emptyList();
        }

        // Group enrollments by studentId
        Map<UUID, List<EnrollmentCache>> byStudent = activeEnrollments.stream()
                .collect(Collectors.groupingBy(EnrollmentCache::getStudentId));

        List<FeeCycleResponse> generated = new ArrayList<>();
        LocalDateTime generatedDate = LocalDateTime.now();
        // Due date is the last day of the billing month
        LocalDateTime dueDate = YearMonth.of(year, month).atEndOfMonth().atTime(23, 59, 59);

        for (Map.Entry<UUID, List<EnrollmentCache>> entry : byStudent.entrySet()) {
            UUID studentId = entry.getKey();
            List<EnrollmentCache> enrollments = entry.getValue();

            // Skip if cycle already exists for this student/month/year
            Optional<StudentFeeCycle> existing = feeCycleRepository
                    .findByStudentIdAndBillingMonthAndBillingYear(studentId, month, year);
            if (existing.isPresent()) {
                log.info("Fee cycle already exists for studentId={} for {}/{}, skipping", studentId, month, year);
                generated.add(paymentMapper.toCycleResponse(existing.get()));
                continue;
            }

            BigDecimal totalAmount = enrollments.stream()
                    .map(EnrollmentCache::getCourseFee)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            StudentFeeCycle cycle = StudentFeeCycle.builder()
                    .studentId(studentId)
                    .billingMonth(month)
                    .billingYear(year)
                    .totalAmount(totalAmount)
                    .paidAmount(BigDecimal.ZERO)
                    .outstandingAmount(totalAmount)
                    .status(FeeStatus.UNPAID)
                    .generatedDate(generatedDate)
                    .dueDate(dueDate)
                    .build();

            cycle = feeCycleRepository.save(cycle);

            List<StudentFeeDetail> details = new ArrayList<>();
            for (EnrollmentCache enrollment : enrollments) {
                StudentFeeDetail detail = StudentFeeDetail.builder()
                        .feeCycle(cycle)
                        .studentId(studentId)
                        .enrollmentId(enrollment.getEnrollmentId())
                        .courseId(enrollment.getCourseId())
                        .courseFee(enrollment.getCourseFee())
                        .allocatedPaidAmount(BigDecimal.ZERO)
                        .outstandingAmount(enrollment.getCourseFee())
                        .status(FeeStatus.UNPAID)
                        .teacherId(enrollment.getTeacherId())
                        .instituteShareType(enrollment.getInstituteShareType())
                        .instituteShareValue(enrollment.getInstituteShareValue())
                        .build();
                details.add(detail);
            }

            feeDetailRepository.saveAll(details);
            cycle.setDetails(details);

            // Publish FeeGeneratedEvent per student
            FeeGeneratedEvent event = FeeGeneratedEvent.builder()
                    .feeCycleId(cycle.getId())
                    .studentId(studentId)
                    .billingMonth(month)
                    .billingYear(year)
                    .totalAmount(totalAmount)
                    .occurredAt(Instant.now())
                    .build();
            kafkaTemplate.send(KafkaTopics.FEE_GENERATED, studentId.toString(), event);
            log.info("Published FeeGeneratedEvent for studentId={}, cycleId={}", studentId, cycle.getId());

            generated.add(paymentMapper.toCycleResponseWithDetails(cycle));
        }

        log.info("Generated {} fee cycles for {}/{}", generated.size(), month, year);
        return generated;
    }

    @Transactional(readOnly = true)
    public List<FeeCycleResponse> getFeeCycles(UUID studentId) {
        return feeCycleRepository.findByStudentId(studentId).stream()
                .map(paymentMapper::toCycleResponse)
                .map(this::decorate)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FeeCycleResponse getFeeCycleDetails(UUID feeCycleId) {
        StudentFeeCycle cycle = feeCycleRepository.findById(feeCycleId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Fee cycle not found with id: " + feeCycleId));

        List<StudentFeeDetail> details = feeDetailRepository.findByFeeCycle_Id(feeCycleId);
        cycle.setDetails(details);
        return decorate(paymentMapper.toCycleResponseWithDetails(cycle));
    }

    @Transactional(readOnly = true)
    public List<FeeDetailResponse> getFeeDetailsByCycle(UUID feeCycleId) {
        return feeDetailRepository.findByFeeCycle_Id(feeCycleId).stream()
                .map(this::toDetailDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeeCycleResponse> getOutstanding(UUID studentId) {
        List<StudentFeeCycle> cycles = new ArrayList<>();
        cycles.addAll(feeCycleRepository.findByStudentIdAndStatus(studentId, FeeStatus.UNPAID));
        cycles.addAll(feeCycleRepository.findByStudentIdAndStatus(studentId, FeeStatus.PARTIAL));
        return cycles.stream()
                .map(paymentMapper::toCycleResponse)
                .map(this::decorate)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeeCycleResponse> getDefaulters() {
        List<StudentFeeCycle> cycles = new ArrayList<>();
        cycles.addAll(feeCycleRepository.findByStatus(FeeStatus.UNPAID));
        cycles.addAll(feeCycleRepository.findByStatus(FeeStatus.PARTIAL));
        return cycles.stream()
                .map(paymentMapper::toCycleResponse)
                .map(this::decorate)
                .collect(Collectors.toList());
    }

    /**
     * Fills in read-derived fields: OVERDUE flag/displayStatus and excess/short amounts.
     * OVERDUE is not a persisted status — a cycle is overdue when it is not fully paid and
     * its due date has passed.
     */
    private FeeCycleResponse decorate(FeeCycleResponse response) {
        BigDecimal total = response.getTotalAmount() != null ? response.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paid = response.getPaidAmount() != null ? response.getPaidAmount() : BigDecimal.ZERO;

        BigDecimal excess = paid.subtract(total);
        response.setExcessAmount(excess.signum() > 0 ? excess : BigDecimal.ZERO);
        response.setShortAmount(excess.signum() < 0 ? excess.negate() : BigDecimal.ZERO);

        boolean notFullyPaid = !FeeStatus.PAID.name().equals(response.getStatus());
        boolean pastDue = response.getDueDate() != null
                && response.getDueDate().isBefore(LocalDateTime.now());
        boolean overdue = notFullyPaid && pastDue;

        response.setOverdue(overdue);
        response.setDisplayStatus(overdue ? "OVERDUE" : response.getStatus());
        return response;
    }

    @Transactional(readOnly = true)
    public List<RevenueSummaryResponse> getRevenueSummary() {
        List<StudentFeeCycle> all = feeCycleRepository.findAll();

        // Group by year/month and sum paid amounts
        Map<String, BigDecimal> summaryMap = new LinkedHashMap<>();
        Map<String, int[]> yearMonthMap = new LinkedHashMap<>();

        for (StudentFeeCycle cycle : all) {
            String key = cycle.getBillingYear() + "-" + String.format("%02d", cycle.getBillingMonth());
            summaryMap.merge(key, cycle.getPaidAmount(), BigDecimal::add);
            yearMonthMap.putIfAbsent(key, new int[]{cycle.getBillingYear(), cycle.getBillingMonth()});
        }

        return summaryMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    int[] ym = yearMonthMap.get(e.getKey());
                    return RevenueSummaryResponse.builder()
                            .billingYear(ym[0])
                            .billingMonth(ym[1])
                            .totalPaid(e.getValue())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeeDetailResponse> getFeeDetails(UUID studentId) {
        return feeDetailRepository.findByStudentId(studentId).stream()
                .map(this::toDetailDto)
                .collect(Collectors.toList());
    }

    /** Maps a detail to its DTO and fills the effective (override-aware) shares (F8/F9). */
    private FeeDetailResponse toDetailDto(StudentFeeDetail detail) {
        FeeDetailResponse dto = paymentMapper.toDetailResponse(detail);
        dto.setTeacherId(detail.getTeacherId());
        dto.setInstituteShareAmount(ShareResolver.effectiveInstitute(detail));
        dto.setTeacherShareAmount(ShareResolver.effectiveTeacher(detail));
        dto.setOverridden(detail.getOverriddenAt() != null);
        return dto;
    }

    /**
     * Per-teacher revenue rollup (F9) over fully-PAID details. "collected" is the sum of
     * allocatedPaidAmount on PAID details; institute/teacher shares use effective (override-aware)
     * amounts. Details without a teacherId are skipped.
     */
    @Transactional(readOnly = true)
    public List<TeacherRevenueSummary> getTeacherSummaries() {
        Map<UUID, TeacherRevenueSummary.TeacherRevenueSummaryBuilder> byTeacher = new LinkedHashMap<>();
        Map<UUID, long[]> counts = new HashMap<>();
        Map<UUID, BigDecimal[]> sums = new HashMap<>();

        for (StudentFeeDetail detail : paidDetailsWithTeacher()) {
            UUID teacherId = detail.getTeacherId();
            counts.computeIfAbsent(teacherId, k -> new long[1])[0]++;
            BigDecimal[] agg = sums.computeIfAbsent(teacherId,
                    k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            agg[0] = agg[0].add(detail.getAllocatedPaidAmount());
            agg[1] = agg[1].add(ShareResolver.effectiveInstitute(detail));
            agg[2] = agg[2].add(ShareResolver.effectiveTeacher(detail));
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

    /** Single-teacher rollup (F9), zeros if the teacher has no fully-PAID details. */
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

    private List<StudentFeeDetail> paidDetailsWithTeacher() {
        return feeDetailRepository.findAll().stream()
                .filter(d -> d.getStatus() == FeeStatus.PAID)
                .filter(d -> d.getTeacherId() != null)
                .collect(Collectors.toList());
    }

    /**
     * Principal override of a single detail's institute/teacher split (F8/F12/F14). Auditable:
     * records who and when, keeps the originally resolved amounts intact. Valid when both shares
     * are ≥ 0 and |(institute + teacher) − billed| ≤ tolerance.
     */
    @Transactional
    public FeeDetailResponse overrideShare(UUID feeDetailId, ShareOverrideRequest request) {
        StudentFeeDetail detail = feeDetailRepository.findById(feeDetailId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Fee detail not found with id: " + feeDetailId));

        BigDecimal institute = request.getInstituteShare();
        BigDecimal teacher = request.getTeacherShare();
        BigDecimal billed = detail.getAllocatedPaidAmount() != null
                ? detail.getAllocatedPaidAmount() : BigDecimal.ZERO;
        BigDecimal drift = institute.add(teacher).subtract(billed).abs();
        if (drift.compareTo(overrideTolerance) > 0) {
            throw ApiException.badRequest("Override institute + teacher share (" + institute.add(teacher)
                    + ") must be within " + overrideTolerance + " of the billed amount (" + billed + ")");
        }

        detail.setOverrideInstituteShare(institute);
        detail.setOverrideTeacherShare(teacher);
        detail.setOverriddenBy(request.getOverriddenBy());
        detail.setOverriddenAt(LocalDateTime.now());
        feeDetailRepository.save(detail);
        log.info("Principal {} overrode share on feeDetailId={} (institute={}, teacher={})",
                request.getOverriddenBy(), feeDetailId, institute, teacher);

        return toDetailDto(detail);
    }
}
