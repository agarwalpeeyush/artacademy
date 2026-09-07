-- V2__update_attendance_schema_uuid.sql
DROP TABLE IF EXISTS student_attendance CASCADE;
DROP TABLE IF EXISTS teacher_attendance CASCADE;

CREATE TABLE TEACHER_ATTENDANCE (
    ID              UUID         PRIMARY KEY,
    TEACHER_ID      UUID         NOT NULL,
    ATTENDANCE_DATE DATE         NOT NULL,
    STATUS          VARCHAR(20)  NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_teacher_attendance_teacher_date UNIQUE (TEACHER_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_teacher_attendance_date ON TEACHER_ATTENDANCE (ATTENDANCE_DATE);

CREATE TABLE STUDENT_ATTENDANCE (
    ID              UUID         PRIMARY KEY,
    STUDENT_ID      UUID         NOT NULL,
    CLASS_ID        UUID         NOT NULL,
    ATTENDANCE_DATE DATE         NOT NULL,
    STATUS          VARCHAR(20)  NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_student_attendance_student_class_date UNIQUE (STUDENT_ID, CLASS_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_student_attendance_student_date ON STUDENT_ATTENDANCE (STUDENT_ID, ATTENDANCE_DATE);
CREATE INDEX idx_student_attendance_class_date   ON STUDENT_ATTENDANCE (CLASS_ID, ATTENDANCE_DATE);
