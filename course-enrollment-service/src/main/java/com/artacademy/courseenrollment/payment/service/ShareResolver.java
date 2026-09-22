package com.artacademy.courseenrollment.payment.service;

import com.artacademy.common.fee.ShareType;
import com.artacademy.courseenrollment.payment.domain.FeeBill;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Resolves the institute/teacher split of a billed amount from a frozen share rule (F6), and
 * exposes the <em>effective</em> shares of a bill (F8): a principal override wins over the
 * resolved amounts when present.
 *
 * <p>F6: AMOUNT rule → institute = min(value, billed); PERCENTAGE rule →
 * institute = round(billed × value/100, 2, HALF_UP). The teacher always takes the remainder,
 * so institute never exceeds billed and the two shares sum to billed.
 */
final class ShareResolver {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private ShareResolver() {
    }

    /** Institute cut of {@code billed} under the frozen rule. Null/typeless rule yields zero. */
    static BigDecimal institute(ShareType type, BigDecimal value, BigDecimal billed) {
        BigDecimal base = billed != null ? billed : BigDecimal.ZERO;
        if (type == null || value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal institute = switch (type) {
            case AMOUNT -> value.min(base);
            case PERCENTAGE -> base.multiply(value)
                    .divide(HUNDRED, 2, RoundingMode.HALF_UP);
        };
        return institute.min(base).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    /** Teacher remainder = billed − institute. */
    static BigDecimal teacher(BigDecimal billed, BigDecimal institute) {
        BigDecimal base = billed != null ? billed : BigDecimal.ZERO;
        return base.subtract(institute).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Effective institute share of a bill (F8): the override when present, otherwise the persisted
     * resolved amount, otherwise a live computation from the frozen rule against the amount paid.
     */
    static BigDecimal effectiveInstitute(FeeBill bill) {
        if (bill.getOverrideInstituteShare() != null) {
            return bill.getOverrideInstituteShare();
        }
        if (bill.getInstituteShareAmount() != null) {
            return bill.getInstituteShareAmount();
        }
        return institute(bill.getInstituteShareType(), bill.getInstituteShareValue(),
                bill.getPaidAmount());
    }

    /** Effective teacher share of a bill (F8), mirroring {@link #effectiveInstitute}. */
    static BigDecimal effectiveTeacher(FeeBill bill) {
        if (bill.getOverrideTeacherShare() != null) {
            return bill.getOverrideTeacherShare();
        }
        if (bill.getTeacherShareAmount() != null) {
            return bill.getTeacherShareAmount();
        }
        return teacher(bill.getPaidAmount(), effectiveInstitute(bill));
    }
}
