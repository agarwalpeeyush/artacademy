package com.artacademy.reporting.kafka;

import com.artacademy.common.events.FeeGeneratedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.PaymentReceivedEvent;
import com.artacademy.reporting.domain.RevenueSummary;
import com.artacademy.reporting.domain.StudentReport;
import com.artacademy.reporting.repository.RevenueSummaryRepository;
import com.artacademy.reporting.repository.StudentReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventConsumer {

    private final RevenueSummaryRepository revenueSummaryRepository;
    private final StudentReportRepository studentReportRepository;

    @KafkaListener(
        topics = KafkaTopics.PAYMENT_RECEIVED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handlePaymentReceived(@Payload PaymentReceivedEvent event) {
        log.info("Received PaymentReceivedEvent: paymentId={}, studentId={}, amount={}",
                event.getPaymentId(), event.getStudentId(), event.getAmount());

        // Derive billing month/year from the event's occurred timestamp
        Instant occurred = event.getOccurredAt() != null ? event.getOccurredAt() : Instant.now();
        var zonedDateTime = occurred.atZone(ZoneId.systemDefault());
        int month = zonedDateTime.getMonthValue();
        int year  = zonedDateTime.getYear();

        RevenueSummary summary = getOrCreateRevenueSummary(month, year);
        summary.setTotalCollected(summary.getTotalCollected().add(event.getAmount()));
        summary.setOutstanding(summary.getOutstanding().subtract(event.getAmount()));
        revenueSummaryRepository.save(summary);

        // Update student's last payment date and reduce active balance
        studentReportRepository.findByStudentId(event.getStudentId()).ifPresent(studentReport -> {
            studentReport.setLastPaymentDate(zonedDateTime.toLocalDateTime());
            if (studentReport.getActiveFeeBalance().compareTo(event.getAmount()) >= 0) {
                studentReport.setActiveFeeBalance(
                        studentReport.getActiveFeeBalance().subtract(event.getAmount()));
            } else {
                studentReport.setActiveFeeBalance(java.math.BigDecimal.ZERO);
            }
            studentReportRepository.save(studentReport);
        });

        log.debug("Updated RevenueSummary for month={}/{} after payment", month, year);
    }

    @KafkaListener(
        topics = KafkaTopics.FEE_GENERATED,
        groupId = "${spring.kafka.consumer.group-id:reporting-service}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleFeeGenerated(@Payload FeeGeneratedEvent event) {
        log.info("Received FeeGeneratedEvent: feeCycleId={}, studentId={}, billingMonth={}/{}, amount={}",
                event.getFeeCycleId(), event.getStudentId(),
                event.getBillingMonth(), event.getBillingYear(), event.getTotalAmount());

        RevenueSummary summary = getOrCreateRevenueSummary(event.getBillingMonth(), event.getBillingYear());
        summary.setTotalBilled(summary.getTotalBilled().add(event.getTotalAmount()));
        summary.setOutstanding(summary.getOutstanding().add(event.getTotalAmount()));
        summary.setStudentCount(summary.getStudentCount() + 1);
        revenueSummaryRepository.save(summary);

        // Update student active balance
        studentReportRepository.findByStudentId(event.getStudentId()).ifPresent(studentReport -> {
            studentReport.setActiveFeeBalance(
                    studentReport.getActiveFeeBalance().add(event.getTotalAmount()));
            studentReportRepository.save(studentReport);
        });

        log.debug("Updated RevenueSummary for month={}/{} after fee generation",
                event.getBillingMonth(), event.getBillingYear());
    }

    private RevenueSummary getOrCreateRevenueSummary(int month, int year) {
        return revenueSummaryRepository.findByBillingMonthAndBillingYear(month, year)
                .orElseGet(() -> RevenueSummary.builder()
                        .billingMonth(month)
                        .billingYear(year)
                        .build());
    }
}
