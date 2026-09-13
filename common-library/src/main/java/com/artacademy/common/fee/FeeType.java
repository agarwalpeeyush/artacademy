package com.artacademy.common.fee;

/**
 * Authoritative vocabulary of fee types shared across course-enrollment-service (owns the
 * per-course fee catalog) and payment-service (generates fee cycles). Defined once here so the
 * two services cannot diverge.
 *
 * <p>Each type has an intrinsic {@link FeeCadence}. RECURRING fees drive the monthly cycle
 * generator; ONE_TIME fees are generated at their trigger point.
 */
public enum FeeType {
    ADMISSION(FeeCadence.ONE_TIME),
    MONTHLY(FeeCadence.RECURRING),
    EXAM(FeeCadence.ONE_TIME),
    ONE_TIME_SHORT_TERM(FeeCadence.ONE_TIME);

    private final FeeCadence cadence;

    FeeType(FeeCadence cadence) {
        this.cadence = cadence;
    }

    public FeeCadence getCadence() {
        return cadence;
    }
}
