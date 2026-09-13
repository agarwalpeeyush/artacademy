package com.artacademy.notification.kafka;

import com.artacademy.common.events.AttendanceRecordedEvent;
import com.artacademy.common.events.ExamScheduledEvent;
import com.artacademy.common.events.FeeGeneratedEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.NotificationRequestEvent;
import com.artacademy.common.events.PaymentReceivedEvent;
import com.artacademy.notification.dto.NotificationRequest;
import com.artacademy.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final NotificationService notificationService;

    // -------------------------------------------------------------------------
    // notification-request topic
    // Generic notification trigger sent by any other service
    // -------------------------------------------------------------------------

    @KafkaListener(
            topics = KafkaTopics.NOTIFICATION_REQUEST,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onNotificationRequest(@Payload NotificationRequestEvent event) {
        log.info("Received NotificationRequestEvent: subject={}", event.getSubject());
        try {
            NotificationRequest request = NotificationRequest.builder()
                    .recipientEmail(event.getRecipientEmail())
                    .recipientPhone(event.getRecipientPhone())
                    .subject(event.getSubject())
                    .body(event.getBody())
                    .channel(event.getChannel() != null ? event.getChannel() : "EMAIL")
                    .build();
            notificationService.sendNotification(request);
        } catch (Exception ex) {
            log.error("Error processing NotificationRequestEvent: {}", ex.getMessage(), ex);
        }
    }

    // -------------------------------------------------------------------------
    // fee-generated topic
    // Remind student that a fee cycle has been generated for the current month
    // -------------------------------------------------------------------------

    @KafkaListener(
            topics = KafkaTopics.FEE_GENERATED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onFeeGenerated(@Payload FeeGeneratedEvent event) {
        log.info("Received FeeGeneratedEvent: studentId={}, amount={}", event.getStudentId(), event.getTotalAmount());
        try {
            BigDecimal amount = event.getTotalAmount() != null ? event.getTotalAmount() : BigDecimal.ZERO;
            String subject = String.format("Fee Reminder – %s/%s",
                    event.getBillingMonth(), event.getBillingYear());
            String body = String.format(
                    "Dear Student,%n%nYour fee for %s/%s has been generated.%n"
                    + "Total Amount Due: %.2f%n%n"
                    + "Please make the payment before the due date to avoid any late fees.%n%n"
                    + "Regards,%nArt Academy",
                    event.getBillingMonth(), event.getBillingYear(), amount);

            NotificationRequest request = NotificationRequest.builder()
                    .userId(event.getStudentId())
                    .subject(subject)
                    .body(body)
                    .channel("EMAIL")
                    .build();
            notificationService.sendNotification(request);
        } catch (Exception ex) {
            log.error("Error processing FeeGeneratedEvent for studentId={}: {}", event.getStudentId(), ex.getMessage(), ex);
        }
    }

    // -------------------------------------------------------------------------
    // payment-received topic
    // Confirm to the student that their payment was received
    // -------------------------------------------------------------------------

    @KafkaListener(
            topics = KafkaTopics.PAYMENT_RECEIVED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onPaymentReceived(@Payload PaymentReceivedEvent event) {
        log.info("Received PaymentReceivedEvent: studentId={}, paymentId={}", event.getStudentId(), event.getPaymentId());
        try {
            BigDecimal amount = event.getAmount() != null ? event.getAmount() : BigDecimal.ZERO;
            String subject = "Payment Confirmation – Art Academy";
            String body = String.format(
                    "Dear Student,%n%nWe have successfully received your payment of %.2f.%n"
                    + "Payment ID: %s%n"
                    + "Fee Cycle ID: %s%n%n"
                    + "Thank you for your timely payment.%n%n"
                    + "Regards,%nArt Academy",
                    amount, event.getPaymentId().toString(), event.getFeeCycleId().toString());

            NotificationRequest request = NotificationRequest.builder()
                    .userId(event.getStudentId())
                    .subject(subject)
                    .body(body)
                    .channel("EMAIL")
                    .build();
            notificationService.sendNotification(request);
        } catch (Exception ex) {
            log.error("Error processing PaymentReceivedEvent for studentId={}: {}", event.getStudentId(), ex.getMessage(), ex);
        }
    }

    // -------------------------------------------------------------------------
    // attendance-recorded topic
    // Send an absence alert when a student's attendance status is ABSENT
    // -------------------------------------------------------------------------

    @KafkaListener(
            topics = KafkaTopics.ATTENDANCE_RECORDED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onAttendanceRecorded(@Payload AttendanceRecordedEvent event) {
        log.info("Received AttendanceRecordedEvent: type={}, subjectId={}, status={}",
                event.getAttendanceType(), event.getSubjectId(), event.getStatus());

        if (!"ABSENT".equalsIgnoreCase(event.getStatus())) {
            return; // Only notify for absences
        }
        if (!"STUDENT".equalsIgnoreCase(event.getAttendanceType())) {
            return; // Only notify for student absences
        }

        try {
            String subject = "Absence Alert – Art Academy";
            String body = String.format(
                    "Dear Parent/Guardian,%n%n"
                    + "This is to inform you that your ward (Student ID: %s) was marked ABSENT "
                    + "on %s.%n%n"
                    + "Please ensure regular attendance.%n%n"
                    + "Regards,%nArt Academy",
                    event.getSubjectId().toString(), event.getAttendanceDate());

            NotificationRequest request = NotificationRequest.builder()
                    .userId(event.getSubjectId())
                    .subject(subject)
                    .body(body)
                    .channel("EMAIL")
                    .build();
            notificationService.sendNotification(request);
        } catch (Exception ex) {
            log.error("Error processing AttendanceRecordedEvent for subjectId={}: {}",
                    event.getSubjectId(), ex.getMessage(), ex);
        }
    }

    // -------------------------------------------------------------------------
    // exam-scheduled topic
    // Notify each enrolled student that an exam has been scheduled (R19)
    // -------------------------------------------------------------------------

    @KafkaListener(
            topics = KafkaTopics.EXAM_SCHEDULED,
            groupId = "${spring.kafka.consumer.group-id:notification-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onExamScheduled(@Payload ExamScheduledEvent event) {
        List<ExamScheduledEvent.EnrolledStudent> students =
                event.getStudents() != null ? event.getStudents() : List.of();
        log.info("Received ExamScheduledEvent: examId={}, courseName={}, {} enrolled students",
                event.getExamId(), event.getCourseName(), students.size());

        String subject = String.format("Exam Scheduled – %s", event.getCourseName());
        String body = String.format(
                "Dear Student,%n%n"
                + "An exam has been scheduled for %s.%n"
                + "Date: %s%n"
                + "Time: %s – %s%n%n"
                + "Please be present on time.%n%n"
                + "Regards,%nArt Academy",
                event.getCourseName(), event.getExamDate(), event.getStartTime(), event.getEndTime());

        for (ExamScheduledEvent.EnrolledStudent student : students) {
            try {
                NotificationRequest request = NotificationRequest.builder()
                        .userId(student.getStudentId())
                        .subject(subject)
                        .body(body)
                        .channel("EMAIL")
                        .build();
                notificationService.sendNotification(request);
            } catch (Exception ex) {
                log.error("Error notifying studentId={} of examId={}: {}",
                        student.getStudentId(), event.getExamId(), ex.getMessage(), ex);
            }
        }
    }
}
