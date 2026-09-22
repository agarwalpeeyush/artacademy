package com.artacademy.courseenrollment.payment.service;

import com.artacademy.courseenrollment.payment.domain.FeeBill;
import com.artacademy.courseenrollment.payment.domain.FeeStatus;
import com.artacademy.courseenrollment.payment.dto.FeeBillResponse;
import com.artacademy.courseenrollment.payment.mapper.PaymentMapper;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;

/**
 * Maps a {@link FeeBill} to its response and fills the fields the mapper can't: effective
 * (override-aware) shares and the read-derived overdue / displayStatus / excess / short. A bill
 * is OVERDUE when it is not fully paid and its due date has passed — not a persisted status.
 */
final class BillDecorator {

    private BillDecorator() {
    }

    static FeeBillResponse decorate(FeeBill bill, PaymentMapper mapper, Clock clock) {
        FeeBillResponse dto = mapper.toBillResponse(bill);
        dto.setInstituteShareAmount(ShareResolver.effectiveInstitute(bill));
        dto.setTeacherShareAmount(ShareResolver.effectiveTeacher(bill));
        dto.setOverridden(bill.getOverriddenAt() != null);

        BigDecimal due = bill.getAmountDue() != null ? bill.getAmountDue() : BigDecimal.ZERO;
        BigDecimal paid = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal excess = paid.subtract(due);
        dto.setExcessAmount(excess.signum() > 0 ? excess : BigDecimal.ZERO);
        dto.setShortAmount(excess.signum() < 0 ? excess.negate() : BigDecimal.ZERO);

        boolean notFullyPaid = bill.getStatus() != FeeStatus.PAID;
        boolean pastDue = bill.getDueDate() != null
                && bill.getDueDate().isBefore(LocalDateTime.now(clock));
        boolean overdue = notFullyPaid && pastDue;
        dto.setOverdue(overdue);
        dto.setDisplayStatus(overdue ? "OVERDUE" : dto.getStatus());
        return dto;
    }
}
