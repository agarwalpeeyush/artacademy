package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class StudentReportResponse {

    private UUID id;
    private UUID studentId;
    private String firstName;
    private String lastName;
    private Integer totalEnrollments;
    private BigDecimal activeFeeBalance;
    private LocalDateTime lastPaymentDate;
}
