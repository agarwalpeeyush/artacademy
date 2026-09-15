package com.artacademy.common.fee;

/**
 * How a course/enrollment fee line expresses the institute's cut of a billed amount.
 *
 * <p>AMOUNT: the configured value is the institute's absolute cut (capped at the billed amount);
 * teacher share = billed − institute. PERCENTAGE: the institute takes {@code value}% of the billed
 * amount (value ∈ [0,100]); teacher share = billed − institute. In both cases the teacher share is
 * whatever remains, and the institute never exceeds the billed amount.
 */
public enum ShareType {
    AMOUNT,
    PERCENTAGE
}
