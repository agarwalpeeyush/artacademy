package com.artacademy.attendance.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Audit-log row written on every direct attendance edit (R16). There is no request/approve/reject
 * workflow: a teacher (student attendance) or principal (student or teacher attendance) edits the
 * record directly, and one of these rows is appended capturing the old→new status, who made the
 * change, their role, and when.
 */
@Entity
@Table(name = "ATTENDANCE_CORRECTION")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceCorrection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** STUDENT or TEACHER — which attendance table the edited row lives in. */
    @Enumerated(EnumType.STRING)
    @Column(name = "ATTENDANCE_TYPE", nullable = false, length = 20)
    private AttendanceRecordType attendanceType;

    /** Primary key of the edited STUDENT_ATTENDANCE or TEACHER_ATTENDANCE row. */
    @Column(name = "ATTENDANCE_ID", nullable = false)
    private UUID attendanceId;

    /** The student or teacher the edited row belongs to. */
    @Column(name = "SUBJECT_ID", nullable = false)
    private UUID subjectId;

    /** The timetable slot the edited attendance row belongs to. */
    @Column(name = "TIMETABLE_ID", nullable = false)
    private UUID timetableId;

    @Column(name = "ATTENDANCE_DATE", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "OLD_STATUS", nullable = false, length = 20)
    private AttendanceStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "NEW_STATUS", nullable = false, length = 20)
    private AttendanceStatus newStatus;

    @Column(name = "REASON", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "EDITED_BY_USER_ID", nullable = false)
    private UUID editedByUserId;

    /** Role of the editor at edit time: TEACHER or PRINCIPAL. */
    @Column(name = "EDITOR_ROLE", nullable = false, length = 20)
    private String editorRole;

    @Column(name = "EDITED_AT", nullable = false)
    private Instant editedAt;

    @PrePersist
    void onCreate() {
        if (editedAt == null) {
            editedAt = Instant.now();
        }
    }
}
