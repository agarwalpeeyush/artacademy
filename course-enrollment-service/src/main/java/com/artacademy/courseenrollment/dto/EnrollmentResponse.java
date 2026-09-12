package com.artacademy.courseenrollment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {

    private UUID id;
    private UUID studentId;
    private UUID courseId;
    private UUID classId;
    private String courseName;
    private String className;
    private LocalDate enrollmentDate;
    private String status;
    private boolean admissionFeePaid;
}
