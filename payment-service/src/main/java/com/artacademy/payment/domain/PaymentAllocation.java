package com.artacademy.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "PAYMENT_ALLOCATIONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PAYMENT_ID", nullable = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FEE_DETAIL_ID", nullable = false)
    private StudentFeeDetail feeDetail;

    @Column(name = "ALLOCATED_AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal allocatedAmount;
}
