package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class RevenueSummaryResponse {

    private UUID id;
    private Integer billingMonth;
    private Integer billingYear;
    private BigDecimal totalBilled;
    private BigDecimal totalCollected;
    private BigDecimal outstanding;
    private Integer studentCount;
}
