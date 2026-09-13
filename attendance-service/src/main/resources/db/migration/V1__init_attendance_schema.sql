-- Attendance service schema (attendance_db).

CREATE TABLE CLASS_SESSION (
    ID                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    CLASS_ID            UUID NOT NULL,
    COURSE_ID           UUID,
    SESSION_DATE        DATE NOT NULL,
    START_TIME          TIME,
    END_TIME            TIME,
    SESSION_KIND        VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    ORIGINAL_SESSION_ID UUID,
    STATUS              VARCHAR(20) NOT NULL,
    CONSTRAINT uq_class_session_class_date_kind UNIQUE (CLASS_ID, SESSION_DATE, SESSION_KIND),
    CONSTRAINT fk_class_session_original FOREIGN KEY (ORIGINAL_SESSION_ID) REFERENCES CLASS_SESSION (ID)
);

CREATE INDEX idx_class_session_class_id ON CLASS_SESSION (CLASS_ID);

CREATE TABLE STUDENT_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID      UUID NOT NULL,
    CLASS_ID        UUID NOT NULL,
    COURSE_ID       UUID,
    SESSION_ID      UUID,
    ATTENDANCE_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_student_attendance UNIQUE (STUDENT_ID, CLASS_ID, ATTENDANCE_DATE, SESSION_ID),
    CONSTRAINT fk_student_attendance_session FOREIGN KEY (SESSION_ID) REFERENCES CLASS_SESSION (ID)
);

CREATE INDEX idx_student_attendance_student_date ON STUDENT_ATTENDANCE (STUDENT_ID, ATTENDANCE_DATE);
CREATE INDEX idx_student_attendance_class_date ON STUDENT_ATTENDANCE (CLASS_ID, ATTENDANCE_DATE);

CREATE TABLE TEACHER_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID      UUID NOT NULL,
    CLASS_ID        UUID NOT NULL,
    COURSE_ID       UUID,
    ATTENDANCE_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_teacher_attendance UNIQUE (TEACHER_ID, CLASS_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_teacher_attendance_date ON TEACHER_ATTENDANCE (ATTENDANCE_DATE);
CREATE INDEX idx_teacher_attendance_class_date ON TEACHER_ATTENDANCE (CLASS_ID, ATTENDANCE_DATE);

-- Audit log of direct attendance edits (R16). No request/approve/reject workflow: one row is
-- appended per edit capturing old->new status, who made it, their role, and when.
CREATE TABLE ATTENDANCE_CORRECTION (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ATTENDANCE_TYPE   VARCHAR(20) NOT NULL,
    ATTENDANCE_ID     UUID NOT NULL,
    SUBJECT_ID        UUID NOT NULL,
    CLASS_ID          UUID NOT NULL,
    ATTENDANCE_DATE   DATE NOT NULL,
    OLD_STATUS        VARCHAR(20) NOT NULL,
    NEW_STATUS        VARCHAR(20) NOT NULL,
    REASON            TEXT,
    EDITED_BY_USER_ID UUID NOT NULL,
    EDITOR_ROLE       VARCHAR(20) NOT NULL,
    EDITED_AT         TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_correction_attendance ON ATTENDANCE_CORRECTION (ATTENDANCE_ID);
CREATE INDEX idx_correction_subject ON ATTENDANCE_CORRECTION (SUBJECT_ID);
CREATE INDEX idx_correction_editor ON ATTENDANCE_CORRECTION (EDITED_BY_USER_ID);
