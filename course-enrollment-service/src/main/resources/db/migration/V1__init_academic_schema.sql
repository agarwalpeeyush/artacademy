-- V1__init_academic_schema.sql
-- Initial schema for the course-enrollment-service

-- ============================================================
-- Courses table
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id             BIGSERIAL    PRIMARY KEY,
    course_code    VARCHAR(50)  NOT NULL UNIQUE,
    course_name    VARCHAR(255) NOT NULL,
    course_type    VARCHAR(50),
    description    TEXT,
    monthly_fee    NUMERIC(12, 2) CHECK (monthly_fee >= 0),
    admission_fee  NUMERIC(12, 2) CHECK (admission_fee >= 0),
    duration_months INT,
    status         VARCHAR(50)  NOT NULL
);

-- ============================================================
-- Classes table
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
    id          BIGSERIAL    PRIMARY KEY,
    course_id   BIGINT       NOT NULL REFERENCES courses(id),
    teacher_id  BIGINT,
    class_name  VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    capacity    INT          NOT NULL CHECK (capacity > 0),
    status      VARCHAR(50)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_course_id   ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id  ON classes(teacher_id);

-- ============================================================
-- Enrollments table
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id              BIGSERIAL    PRIMARY KEY,
    student_id      BIGINT       NOT NULL,
    course_id       BIGINT       NOT NULL REFERENCES courses(id),
    class_id        BIGINT       NOT NULL REFERENCES classes(id),
    enrollment_date DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    CONSTRAINT uq_enrollment_student_course UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id  ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id   ON enrollments(class_id);
