package com.artacademy.courseenrollment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentFeesUpdateRequest {

    @NotNull(message = "Fees are required")
    @Valid
    private List<EnrollmentFeeDto> fees;
}
