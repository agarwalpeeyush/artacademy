package com.artacademy.courseenrollment.service;

import com.artacademy.common.events.ExamScheduledEvent;
import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.FeeType;
import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.domain.CourseFee;
import com.artacademy.courseenrollment.domain.Exam;
import com.artacademy.courseenrollment.dto.ExamRequest;
import com.artacademy.courseenrollment.dto.ExamResponse;
import com.artacademy.courseenrollment.repository.CourseRepository;
import com.artacademy.courseenrollment.repository.EnrollmentRepository;
import com.artacademy.courseenrollment.repository.ExamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ExamService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_SCHEDULED = "SCHEDULED";

    private final ExamRepository examRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public List<ExamResponse> getAllExams() {
        return examRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ExamResponse> getExamsByCourse(UUID courseId) {
        return examRepository.findByCourseId(courseId).stream().map(this::toResponse).toList();
    }

    public ExamResponse scheduleExam(ExamRequest request) {
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw ApiException.badRequest("Exam start time must be before end time");
        }

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ApiException.notFound("Course not found with id: " + request.getCourseId()));

        // The course must carry an EXAM fee for the trigger to bill anything (R19 / M2).
        BigDecimal examFee = course.getFees().stream()
                .filter(f -> f.getFeeType() == FeeType.EXAM)
                .map(CourseFee::getAmount)
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest(
                        "Course '" + course.getCourseCode() + "' has no EXAM fee configured; "
                        + "add an EXAM fee to the course before scheduling an exam"));

        Exam exam = Exam.builder()
                .courseId(course.getId())
                .title(request.getTitle())
                .examDate(request.getExamDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(STATUS_SCHEDULED)
                .build();
        Exam saved = examRepository.save(exam);
        log.info("Scheduled exam id={} for courseId={} on {}", saved.getId(), course.getId(), saved.getExamDate());

        List<ExamScheduledEvent.EnrolledStudent> students = enrollmentRepository.findByCourseId(course.getId()).stream()
                .filter(e -> STATUS_ACTIVE.equalsIgnoreCase(e.getStatus()))
                .map(e -> ExamScheduledEvent.EnrolledStudent.builder()
                        .studentId(e.getStudentId())
                        .enrollmentId(e.getId())
                        .build())
                .toList();

        ExamScheduledEvent event = ExamScheduledEvent.builder()
                .examId(saved.getId())
                .courseId(course.getId())
                .courseName(course.getCourseName())
                .examDate(saved.getExamDate())
                .startTime(saved.getStartTime())
                .endTime(saved.getEndTime())
                .feeAmount(examFee)
                .students(students)
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.EXAM_SCHEDULED, saved.getId().toString(), event);
        log.info("Published ExamScheduledEvent for examId={}, {} enrolled students", saved.getId(), students.size());

        return toResponse(saved, course.getCourseName());
    }

    private ExamResponse toResponse(Exam exam) {
        String courseName = courseRepository.findById(exam.getCourseId())
                .map(Course::getCourseName)
                .orElse(null);
        return toResponse(exam, courseName);
    }

    private ExamResponse toResponse(Exam exam, String courseName) {
        return ExamResponse.builder()
                .id(exam.getId())
                .courseId(exam.getCourseId())
                .courseName(courseName)
                .title(exam.getTitle())
                .examDate(exam.getExamDate())
                .startTime(exam.getStartTime())
                .endTime(exam.getEndTime())
                .status(exam.getStatus())
                .build();
    }
}
