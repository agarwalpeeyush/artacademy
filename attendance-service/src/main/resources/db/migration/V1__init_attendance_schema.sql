-- Attendance service schema (attendance_db).

-- STUDENT_ATTENDANCE is keyed by (student_id, timetable_id, attendance_date) with course_id as a
-- scope column. START_TIME/END_TIME record the actual session times (prefilled from the timetable
-- slot, editable per record).
CREATE TABLE STUDENT_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    TIMETABLE_ID    UUID NOT NULL,
    ATTENDANCE_DATE DATE NOT NULL,
    START_TIME      TIME,
    END_TIME        TIME,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_student_attendance UNIQUE (STUDENT_ID, TIMETABLE_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_student_attendance_student_date ON STUDENT_ATTENDANCE (STUDENT_ID, ATTENDANCE_DATE);
CREATE INDEX idx_student_attendance_timetable_date ON STUDENT_ATTENDANCE (TIMETABLE_ID, ATTENDANCE_DATE);

-- TEACHER_ATTENDANCE is keyed by (teacher_id, timetable_id, attendance_date) with course_id scope.
CREATE TABLE TEACHER_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    TIMETABLE_ID    UUID NOT NULL,
    ATTENDANCE_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_teacher_attendance UNIQUE (TEACHER_ID, TIMETABLE_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_teacher_attendance_date ON TEACHER_ATTENDANCE (ATTENDANCE_DATE);
CREATE INDEX idx_teacher_attendance_timetable_date ON TEACHER_ATTENDANCE (TIMETABLE_ID, ATTENDANCE_DATE);

-- Audit log of direct attendance edits (R16). No request/approve/reject workflow: one row is
-- appended per edit capturing old->new status, who made it, their role, and when.
CREATE TABLE ATTENDANCE_CORRECTION (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ATTENDANCE_TYPE   VARCHAR(20) NOT NULL,
    ATTENDANCE_ID     UUID NOT NULL,
    SUBJECT_ID        UUID NOT NULL,
    TIMETABLE_ID      UUID NOT NULL,
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
