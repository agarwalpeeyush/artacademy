package com.artacademy.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** A name-resolved student for the scoped picker on the fee pages. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScopedStudent {

    private UUID studentId;
    private UUID enrollmentId;
    private UUID courseId;
    private UUID teacherId;
    private String studentName;
    private String courseName;
}
