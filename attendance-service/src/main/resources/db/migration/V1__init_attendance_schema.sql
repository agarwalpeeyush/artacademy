-- V1__init_attendance_schema.sql
-- Initial schema for attendance-service: teacher_attendance, student_attendance

CREATE TABLE IF NOT EXISTS teacher_attendance
(
    id              BIGSERIAL    PRIMARY KEY,
    teacher_id      BIGINT       NOT NULL,
    attendance_date DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    remarks         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date
    ON teacher_attendance (teacher_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date
    ON teacher_attendance (attendance_date);

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_attendance
(
    id              BIGSERIAL    PRIMARY KEY,
    student_id      BIGINT       NOT NULL,
    class_id        BIGINT       NOT NULL,
    attendance_date DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    remarks         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_attendance_student_class_date
    ON student_attendance (student_id, class_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date
    ON student_attendance (student_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_student_attendance_class_date
    ON student_attendance (class_id, attendance_date);
