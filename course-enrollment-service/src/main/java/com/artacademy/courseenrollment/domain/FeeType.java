package com.artacademy.courseenrollment.domain;

import com.artacademy.common.fee.FeeCadence;
import jakarta.persistence.*;
import lombok.*;

/**
 * Open-ended catalog of course fee types (Admission, Monthly, Exam, One Time Short Term, ...).
 * New fee types are added as data — no code enum. CODE is the natural key referenced by
 * {@link CourseFee} and {@link EnrollmentFee}.
 */
@Entity
@Table(name = "COURSE_FEE_TYPES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeType {

    @Id
    @Column(name = "CODE", length = 50, unique = true, nullable = false)
    private String code;

    @Column(name = "NAME", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "FREQUENCY", length = 20, nullable = false)
    private FeeCadence frequency;

    @Column(name = "STATUS", nullable = false)
    private String status;
}
