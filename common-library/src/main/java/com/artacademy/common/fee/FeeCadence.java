package com.artacademy.common.fee;

/**
 * How often a fee is billed.
 * RECURRING fees are billed on a repeating (monthly) cycle; ONE_TIME fees are billed once
 * at the relevant trigger (enrollment, exam scheduling, short-term signup, ...).
 */
public enum FeeCadence {
    RECURRING,
    ONE_TIME
}
