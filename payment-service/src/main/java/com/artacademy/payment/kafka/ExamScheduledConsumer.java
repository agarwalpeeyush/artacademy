package com.artacademy.payment.kafka;

import com.artacademy.common.events.ExamScheduledEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.fee.FeeCadence;
import com.artacademy.payment.domain.FeeType;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.repository.StudentFeeDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * On a scheduled exam, upserts an EXAM {@link StudentFeeDetail} catalogue line per enrolled
 * student — it populates the line only. No EXAM bill is created here; the principal batch-bills
 * the course cohort from the Exam Fee page.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExamScheduledConsumer {

    private final StudentFeeDetailRepository feeDetailRepository;

    @KafkaListener(
        topics = KafkaTopics.EXAM_SCHEDULED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleExamScheduled(@Payload ExamScheduledEvent event) {
        List<ExamScheduledEvent.EnrolledStudent> students =
                event.getStudents() != null ? event.getStudents() : List.of();
        log.info("Received ExamScheduledEvent: examId={}, courseId={}, {} enrolled students, feeAmount={}",
                event.getExamId(), event.getCourseId(), students.size(), event.getFeeAmount());

        LocalDate dueDate = event.getExamDate();
        for (ExamScheduledEvent.EnrolledStudent student : students) {
            StudentFeeDetail detail = feeDetailRepository
                    .findByEnrollmentIdAndFeeType(student.getEnrollmentId(), FeeType.EXAM)
                    .orElse(StudentFeeDetail.builder()
                            .enrollmentId(student.getEnrollmentId())
                            .feeType(FeeType.EXAM)
                            .cadence(FeeCadence.ONE_TIME)
                            .build());
            detail.setAmount(event.getFeeAmount());
            detail.setCadence(FeeCadence.ONE_TIME);
            detail.setDueDate(dueDate);
            feeDetailRepository.save(detail);
        }
        log.info("Upserted EXAM fee line for {} student(s) on courseId={}",
                students.size(), event.getCourseId());
    }
}
