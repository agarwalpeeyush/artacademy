-- V1__init_user_schema.sql
-- Initial schema for user-service: teachers, students, teacher_availability

CREATE TABLE IF NOT EXISTS teachers
(
    id             BIGSERIAL    PRIMARY KEY,
    user_id        BIGINT,
    employee_code  VARCHAR(50)  NOT NULL UNIQUE,
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255),
    phone          VARCHAR(50),
    qualification  VARCHAR(500),
    joining_date   DATE,
    status         VARCHAR(50)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teachers_user_id       ON teachers (user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_code ON teachers (employee_code);

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students
(
    id               BIGSERIAL    PRIMARY KEY,
    user_id          BIGINT,
    admission_number VARCHAR(50)  NOT NULL UNIQUE,
    name             VARCHAR(255) NOT NULL,
    dob              DATE,
    father_name      VARCHAR(255),
    mother_name      VARCHAR(255),
    guardian_name    VARCHAR(255),
    email            VARCHAR(255),
    phone            VARCHAR(50),
    address          TEXT,
    status           VARCHAR(50)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_user_id          ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students (admission_number);

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS teacher_availability
(
    id           BIGSERIAL   PRIMARY KEY,
    teacher_id   BIGINT      NOT NULL,
    day_of_week  VARCHAR(20) NOT NULL,
    start_time   TIME        NOT NULL,
    end_time     TIME        NOT NULL,
    CONSTRAINT fk_availability_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_availability_teacher_id ON teacher_availability (teacher_id);
