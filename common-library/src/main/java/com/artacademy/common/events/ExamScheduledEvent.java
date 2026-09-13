package com.artacademy.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Emitted by course-enrollment-service when a principal schedules an exam for a course (R19).
 * <ul>
 *   <li>payment-service consumes it to generate a one-time EXAM fee for each enrolled student.</li>
 *   <li>notification-service consumes it to notify each enrolled student of the exam schedule.</li>
 * </ul>
 * Carries the enrolled {@code studentIds} so consumers don't need a cross-service lookup.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamScheduledEvent {
    private UUID examId;
    private UUID courseId;
    private String courseName;
    private LocalDate examDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal feeAmount;
    private List<EnrolledStudent> students;
    private Instant occurredAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnrolledStudent {
        private UUID studentId;
        private UUID enrollmentId;
    }
}
