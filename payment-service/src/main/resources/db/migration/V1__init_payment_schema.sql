-- V1__init_payment_schema.sql
-- Payment Service schema: fee cycles, fee details, payments, allocations, enrollment cache

-- ============================================================
-- enrollment_cache
-- Local mirror of active enrollments consumed from Kafka
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollment_cache (
    enrollment_id   BIGINT          NOT NULL,
    student_id      BIGINT          NOT NULL,
    course_id       BIGINT          NOT NULL,
    course_fee      NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT pk_enrollment_cache PRIMARY KEY (enrollment_id),
    CONSTRAINT chk_enrollment_cache_status CHECK (status IN ('ACTIVE', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_enrollment_cache_student_id
    ON enrollment_cache (student_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_cache_status
    ON enrollment_cache (status);

-- ============================================================
-- student_fee_cycles
-- One record per student per billing month/year
-- ============================================================
CREATE TABLE IF NOT EXISTS student_fee_cycles (
    id                  BIGSERIAL       NOT NULL,
    student_id          BIGINT          NOT NULL,
    billing_month       INT             NOT NULL,
    billing_year        INT             NOT NULL,
    total_amount        NUMERIC(12, 2)  NOT NULL,
    paid_amount         NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    outstanding_amount  NUMERIC(12, 2)  NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'UNPAID',
    generated_date      TIMESTAMP,
    due_date            TIMESTAMP,
    CONSTRAINT pk_student_fee_cycles PRIMARY KEY (id),
    CONSTRAINT uq_student_fee_cycles_student_month_year
        UNIQUE (student_id, billing_month, billing_year),
    CONSTRAINT chk_student_fee_cycles_status
        CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID')),
    CONSTRAINT chk_student_fee_cycles_billing_month
        CHECK (billing_month BETWEEN 1 AND 12),
    CONSTRAINT chk_student_fee_cycles_billing_year
        CHECK (billing_year >= 2000),
    CONSTRAINT chk_student_fee_cycles_total_amount
        CHECK (total_amount >= 0),
    CONSTRAINT chk_student_fee_cycles_paid_amount
        CHECK (paid_amount >= 0),
    CONSTRAINT chk_student_fee_cycles_outstanding_amount
        CHECK (outstanding_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_student_fee_cycles_student_id
    ON student_fee_cycles (student_id);

CREATE INDEX IF NOT EXISTS idx_student_fee_cycles_status
    ON student_fee_cycles (status);

CREATE INDEX IF NOT EXISTS idx_student_fee_cycles_student_status
    ON student_fee_cycles (student_id, status);

-- ============================================================
-- student_fee_details
-- One record per enrollment per fee cycle
-- ============================================================
CREATE TABLE IF NOT EXISTS student_fee_details (
    id                      BIGSERIAL       NOT NULL,
    fee_cycle_id            BIGINT          NOT NULL,
    student_id              BIGINT          NOT NULL,
    enrollment_id           BIGINT          NOT NULL,
    course_id               BIGINT          NOT NULL,
    course_fee              NUMERIC(12, 2)  NOT NULL,
    allocated_paid_amount   NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    outstanding_amount      NUMERIC(12, 2)  NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'UNPAID',
    CONSTRAINT pk_student_fee_details PRIMARY KEY (id),
    CONSTRAINT fk_student_fee_details_cycle
        FOREIGN KEY (fee_cycle_id) REFERENCES student_fee_cycles (id) ON DELETE CASCADE,
    CONSTRAINT uq_student_fee_details_cycle_enrollment
        UNIQUE (fee_cycle_id, enrollment_id),
    CONSTRAINT chk_student_fee_details_status
        CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID')),
    CONSTRAINT chk_student_fee_details_course_fee
        CHECK (course_fee >= 0),
    CONSTRAINT chk_student_fee_details_allocated_paid_amount
        CHECK (allocated_paid_amount >= 0),
    CONSTRAINT chk_student_fee_details_outstanding_amount
        CHECK (outstanding_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_student_fee_details_fee_cycle_id
    ON student_fee_details (fee_cycle_id);

CREATE INDEX IF NOT EXISTS idx_student_fee_details_student_id
    ON student_fee_details (student_id);

CREATE INDEX IF NOT EXISTS idx_student_fee_details_enrollment_id
    ON student_fee_details (enrollment_id);

-- ============================================================
-- payments
-- A single payment transaction by a student
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id                      BIGSERIAL       NOT NULL,
    fee_cycle_id            BIGINT          NOT NULL,
    student_id              BIGINT          NOT NULL,
    amount                  NUMERIC(12, 2)  NOT NULL,
    payment_mode            VARCHAR(50)     NOT NULL,
    transaction_reference   VARCHAR(200),
    payment_date            TIMESTAMP,
    remarks                 TEXT,
    CONSTRAINT pk_payments PRIMARY KEY (id),
    CONSTRAINT fk_payments_fee_cycle
        FOREIGN KEY (fee_cycle_id) REFERENCES student_fee_cycles (id),
    CONSTRAINT chk_payments_amount
        CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_student_id
    ON payments (student_id);

CREATE INDEX IF NOT EXISTS idx_payments_fee_cycle_id
    ON payments (fee_cycle_id);

-- ============================================================
-- payment_allocations
-- How a payment is split across individual fee detail lines
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
    id                  BIGSERIAL       NOT NULL,
    payment_id          BIGINT          NOT NULL,
    fee_detail_id       BIGINT          NOT NULL,
    allocated_amount    NUMERIC(12, 2)  NOT NULL,
    CONSTRAINT pk_payment_allocations PRIMARY KEY (id),
    CONSTRAINT fk_payment_allocations_payment
        FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocations_fee_detail
        FOREIGN KEY (fee_detail_id) REFERENCES student_fee_details (id),
    CONSTRAINT chk_payment_allocations_allocated_amount
        CHECK (allocated_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id
    ON payment_allocations (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_fee_detail_id
    ON payment_allocations (fee_detail_id);
