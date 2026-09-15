package com.artacademy.courseenrollment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.common.fee.ShareType;

import java.math.BigDecimal;

/**
 * F10 bounds on an institute-share rule, enforced at both the course template and the per-child
 * enrollment edit. A null type means "no institute cut" and is always valid. When a type is set,
 * a value is required; PERCENTAGE ∈ [0,100] and AMOUNT ≥ 0.
 */
final class ShareRuleValidator {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private ShareRuleValidator() {
    }

    static void validate(ShareType type, BigDecimal value, String feeLabel) {
        if (type == null) {
            return;
        }
        if (value == null) {
            throw ApiException.badRequest("Institute share value is required for " + feeLabel);
        }
        if (value.signum() < 0) {
            throw ApiException.badRequest("Institute share value must be non-negative for " + feeLabel);
        }
        if (type == ShareType.PERCENTAGE && value.compareTo(HUNDRED) > 0) {
            throw ApiException.badRequest("Institute share percentage must be between 0 and 100 for " + feeLabel);
        }
    }
}
