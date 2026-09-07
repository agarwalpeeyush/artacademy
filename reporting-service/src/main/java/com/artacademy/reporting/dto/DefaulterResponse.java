package com.artacademy.reporting.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class DefaulterResponse {

    private UUID studentId;
    private String firstName;
    private String lastName;
    private BigDecimal activeFeeBalance;
}
