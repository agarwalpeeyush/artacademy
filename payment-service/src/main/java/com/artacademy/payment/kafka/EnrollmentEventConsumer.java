package com.artacademy.payment.kafka;

import com.artacademy.common.events.EnrollmentCancelledEvent;
import com.artacademy.common.events.EnrollmentCreatedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.payment.domain.EnrollmentStatus;
import com.artacademy.payment.domain.FeeType;
import com.artacademy.payment.domain.StudentFee;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.repository.FeeBillRepository;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import com.artacademy.payment.repository.StudentFeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Records enrollments and their fee catalogue from Kafka — store-only. It upserts the
 * {@link StudentFee} header and re-syncs the {@link StudentFeeDetail} lines to the event; it never
 * materialises a bill. A re-published event (fee edited before payment) refreshes not-yet-billed
 * lines idempotently.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EnrollmentEventConsumer {

    private final StudentFeeRepository studentFeeRepository;
    private final StudentFeeDetailRepository feeDetailRepository;
    private final FeeBillRepository feeBillRepository;

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CREATED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleEnrollmentCreated(@Payload EnrollmentCreatedEvent event) {
        log.info("Received EnrollmentCreatedEvent: enrollmentId={}, studentId={}, courseId={}, teacherId={}",
                event.getEnrollmentId(), event.getStudentId(), event.getCourseId(), event.getTeacherId());

        // 1. Upsert the enrollment header (kept ACTIVE on re-publish).
        StudentFee header = studentFeeRepository.findById(event.getEnrollmentId())
                .orElse(StudentFee.builder()
                        .enrollmentId(event.getEnrollmentId())
                        .build());
        header.setStudentId(event.getStudentId());
        header.setCourseId(event.getCourseId());
        header.setTeacherId(event.getTeacherId());
        header.setStatus(EnrollmentStatus.ACTIVE);
        studentFeeRepository.save(header);

        // 2. Re-sync the catalogue lines. A line already billed for its type is frozen; a
        //    not-yet-billed line is refreshed in place, and new types are inserted.
        List<EnrollmentCreatedEvent.FeeItem> fees = event.getFees() != null ? event.getFees() : List.of();
        for (EnrollmentCreatedEvent.FeeItem fee : fees) {
            FeeType feeType = parseFeeType(fee.getFeeType());
            if (feeType == null) {
                log.warn("Unknown fee type '{}' on enrollmentId={}, skipping",
                        fee.getFeeType(), event.getEnrollmentId());
                continue;
            }
            if (feeBillRepository.existsByEnrollmentIdAndFeeType(event.getEnrollmentId(), feeType)) {
                continue;
            }
            StudentFeeDetail detail = feeDetailRepository
                    .findByEnrollmentIdAndFeeType(event.getEnrollmentId(), feeType)
                    .orElse(StudentFeeDetail.builder()
                            .enrollmentId(event.getEnrollmentId())
                            .feeType(feeType)
                            .build());
            detail.setAmount(fee.getAmount());
            detail.setCadence(fee.getCadence());
            detail.setDueDate(fee.getDueDate());
            detail.setInstituteShareType(fee.getInstituteShareType());
            detail.setInstituteShareValue(fee.getInstituteShareValue());
            feeDetailRepository.save(detail);
        }
        log.info("Stored {} fee line(s) for enrollmentId={}", fees.size(), event.getEnrollmentId());
    }

    @KafkaListener(
        topics = KafkaTopics.ENROLLMENT_CANCELLED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleEnrollmentCancelled(@Payload EnrollmentCancelledEvent event) {
        log.info("Received EnrollmentCancelledEvent: enrollmentId={}, studentId={}",
                event.getEnrollmentId(), event.getStudentId());

        studentFeeRepository.findById(event.getEnrollmentId()).ifPresentOrElse(header -> {
            header.setStatus(EnrollmentStatus.CANCELLED);
            studentFeeRepository.save(header);
            log.info("Marked enrollment {} CANCELLED (bills left as-is)", event.getEnrollmentId());
        }, () -> log.warn("No StudentFee for enrollmentId={} during cancellation",
                event.getEnrollmentId()));
    }

    private static FeeType parseFeeType(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return FeeType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
