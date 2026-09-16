package com.artacademy.courseenrollment.dto;

import com.artacademy.common.fee.FeeCadence;
import com.artacademy.common.fee.ShareType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {

    private UUID id;
    private String courseCode;
    private String courseName;
    private String courseTypeCode;
    private String courseTypeName;
    private String description;
    private Integer durationMonths;
    private String status;
    private List<FeeItem> fees;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeItem {
        private UUID id;
        private String feeType;
        private BigDecimal amount;
        private FeeCadence cadence;
        private ShareType instituteShareType;
        private BigDecimal instituteShareValue;
    }
}
