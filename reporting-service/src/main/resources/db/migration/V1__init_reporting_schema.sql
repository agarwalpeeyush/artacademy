-- V1__init_reporting_schema.sql
-- Reporting Service – read-optimised summary tables

CREATE TABLE IF NOT EXISTS attendance_summary (
    id              BIGSERIAL       PRIMARY KEY,
    subject_type    VARCHAR(20)     NOT NULL,           -- STUDENT | TEACHER
    subject_id      BIGINT          NOT NULL,
    subject_name    VARCHAR(200)    NOT NULL,
    attendance_month INT            NOT NULL,
    attendance_year  INT            NOT NULL,
    total_days      INT             NOT NULL DEFAULT 0,
    present_days    INT             NOT NULL DEFAULT 0,
    absent_days     INT             NOT NULL DEFAULT 0,
    leave_days      INT             NOT NULL DEFAULT 0,
    CONSTRAINT uq_attendance_summary UNIQUE (subject_type, subject_id, attendance_month, attendance_year)
);

CREATE TABLE IF NOT EXISTS revenue_summary (
    id               BIGSERIAL        PRIMARY KEY,
    billing_month    INT              NOT NULL,
    billing_year     INT              NOT NULL,
    total_billed     NUMERIC(12, 2)   NOT NULL DEFAULT 0,
    total_collected  NUMERIC(12, 2)   NOT NULL DEFAULT 0,
    outstanding      NUMERIC(12, 2)   NOT NULL DEFAULT 0,
    student_count    INT              NOT NULL DEFAULT 0,
    CONSTRAINT uq_revenue_summary UNIQUE (billing_month, billing_year)
);

CREATE TABLE IF NOT EXISTS student_report (
    id                  BIGSERIAL        PRIMARY KEY,
    student_id          BIGINT           NOT NULL UNIQUE,
    admission_number    VARCHAR(50),
    name                VARCHAR(200)     NOT NULL,
    total_enrollments   INT              NOT NULL DEFAULT 0,
    active_fee_balance  NUMERIC(12, 2)   NOT NULL DEFAULT 0,
    last_payment_date   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_report (
    id                      BIGSERIAL        PRIMARY KEY,
    teacher_id              BIGINT           NOT NULL UNIQUE,
    employee_code           VARCHAR(50),
    name                    VARCHAR(200)     NOT NULL,
    total_classes           INT              NOT NULL DEFAULT 0,
    attendance_percentage   NUMERIC(5, 2)    NOT NULL DEFAULT 0
);
