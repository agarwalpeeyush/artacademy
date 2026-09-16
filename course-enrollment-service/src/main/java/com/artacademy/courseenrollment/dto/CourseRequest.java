package com.artacademy.courseenrollment.dto;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.ShareType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequest {

    @NotBlank(message = "Course code is required")
    @Size(max = 50, message = "Course code must not exceed 50 characters")
    private String courseCode;

    @NotBlank(message = "Course name is required")
    private String courseName;

    /** Code of an existing {@code COURSE_TYPE} row. */
    @Size(max = 50, message = "Course type code must not exceed 50 characters")
    private String courseTypeCode;

    private String description;

    @Positive(message = "Duration in months must be positive")
    private Integer durationMonths;

    @NotBlank(message = "Status is required")
    private String status;

    /** The full fee set for this course (R5). */
    @Valid
    @Builder.Default
    private List<FeeItem> fees = List.of();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeItem {

        @NotBlank(message = "Fee type is required")
        @Size(max = 50, message = "Fee type code must not exceed 50 characters")
        private String feeType;

        @NotNull(message = "Fee amount is required")
        @DecimalMin(value = "0.0", message = "Fee amount must be non-negative")
        private BigDecimal amount;

        /** Optional — defaults to the fee type's catalog frequency when omitted. */
        private FeeCadence cadence;

        /**
         * Institute-share template default for this line (F2). Optional — null type means no cut.
         * Range validated in the service (PERCENTAGE ∈ [0,100], AMOUNT ≥ 0, F10).
         */
        private ShareType instituteShareType;

        @DecimalMin(value = "0.0", message = "Institute share value must be non-negative")
        private BigDecimal instituteShareValue;
    }
}
