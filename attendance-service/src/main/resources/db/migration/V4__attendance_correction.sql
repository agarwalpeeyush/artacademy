-- V4__attendance_correction.sql
CREATE TABLE ATTENDANCE_CORRECTION (
    ID                       UUID         PRIMARY KEY,
    STUDENT_ATTENDANCE_ID    UUID         NOT NULL,
    STUDENT_ID               UUID         NOT NULL,
    CLASS_ID                 UUID         NOT NULL,
    ATTENDANCE_DATE          DATE         NOT NULL,
    REQUESTED_STATUS         VARCHAR(20)  NOT NULL,
    REASON                   TEXT,
    REQUESTED_BY_TEACHER_ID  UUID         NOT NULL,
    STATUS                   VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    REVIEWED_BY_PRINCIPAL_ID UUID,
    REVIEW_NOTE              TEXT,
    CREATED_AT               TIMESTAMP    NOT NULL,
    REVIEWED_AT              TIMESTAMP
);

CREATE INDEX idx_attendance_correction_status  ON ATTENDANCE_CORRECTION (STATUS);
CREATE INDEX idx_attendance_correction_teacher ON ATTENDANCE_CORRECTION (REQUESTED_BY_TEACHER_ID);
