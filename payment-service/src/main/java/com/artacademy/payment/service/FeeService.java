package com.artacademy.payment.service;

import com.artacademy.common.events.FeeGeneratedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.payment.domain.*;
import com.artacademy.payment.dto.FeeCycleResponse;
import com.artacademy.payment.dto.FeeDetailResponse;
import com.artacademy.payment.dto.RevenueSummaryResponse;
import com.artacademy.payment.mapper.PaymentMapper;
import com.artacademy.payment.repository.EnrollmentCacheRepository;
import com.artacademy.payment.repository.StudentFeeCycleRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
                .map(paymentMapper::toDetailResponse)
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
                .map(paymentMapper::toDetailResponse)
                .collect(Collectors.toList());
    }
}
