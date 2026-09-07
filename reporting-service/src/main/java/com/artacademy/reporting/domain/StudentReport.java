package com.artacademy.reporting.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "STUDENT_REPORT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "STUDENT_ID", nullable = false, unique = true)
    private UUID studentId;

    @Column(name = "FIRST_NAME", nullable = false, length = 200)
    private String firstName;

    @Column(name = "LAST_NAME", length = 200)
    private String lastName;

    @Column(name = "TOTAL_ENROLLMENTS", nullable = false)
    @Builder.Default
    private Integer totalEnrollments = 0;

    @Column(name = "ACTIVE_FEE_BALANCE", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal activeFeeBalance = BigDecimal.ZERO;

    @Column(name = "LAST_PAYMENT_DATE")
    private LocalDateTime lastPaymentDate;
}
