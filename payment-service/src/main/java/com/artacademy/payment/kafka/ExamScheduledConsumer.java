package com.artacademy.payment.kafka;

import com.artacademy.common.events.ExamScheduledEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.payment.service.AdmissionFeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExamScheduledConsumer {

    private final AdmissionFeeService admissionFeeService;

    @KafkaListener(
        topics = KafkaTopics.EXAM_SCHEDULED,
        groupId = "${spring.kafka.consumer.group-id:payment-service-group}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleExamScheduled(@Payload ExamScheduledEvent event) {
        List<ExamScheduledEvent.EnrolledStudent> students =
                event.getStudents() != null ? event.getStudents() : List.of();
        log.info("Received ExamScheduledEvent: examId={}, courseId={}, {} enrolled students, feeAmount={}",
                event.getExamId(), event.getCourseId(), students.size(), event.getFeeAmount());

        for (ExamScheduledEvent.EnrolledStudent student : students) {
            admissionFeeService.generateExamDue(event, student);
        }
    }
}
