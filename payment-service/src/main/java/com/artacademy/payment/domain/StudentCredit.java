package com.artacademy.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A student's carried-forward over-payment balance (§ STUDENT_CREDIT). */
@Entity
@Table(name = "STUDENT_CREDIT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentCredit {

    @Id
    @Column(name = "STUDENT_ID", nullable = false)
    private UUID studentId;

    @Column(name = "BALANCE", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;
}
