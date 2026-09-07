package com.artacademy.courseenrollment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassResponse {

    private UUID id;
    private UUID courseId;
    private UUID teacherId;
    private String className;
    private String roomNumber;
    private Integer capacity;
    private String status;
}
