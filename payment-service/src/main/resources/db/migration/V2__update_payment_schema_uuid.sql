-- V2__update_payment_schema_uuid.sql
DROP TABLE IF EXISTS payment_allocations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS student_fee_details CASCADE;
DROP TABLE IF EXISTS student_fee_cycles CASCADE;
DROP TABLE IF EXISTS enrollment_cache CASCADE;

CREATE TABLE ENROLLMENT_CACHE (
    ENROLLMENT_ID  UUID           NOT NULL,
    STUDENT_ID     UUID           NOT NULL,
    COURSE_ID      UUID           NOT NULL,
    COURSE_FEE     NUMERIC(12,2)  NOT NULL DEFAULT 0,
    STATUS         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT pk_enrollment_cache PRIMARY KEY (ENROLLMENT_ID),
    CONSTRAINT chk_enrollment_cache_status CHECK (STATUS IN ('ACTIVE','CANCELLED'))
);
CREATE INDEX idx_enrollment_cache_student_id ON ENROLLMENT_CACHE(STUDENT_ID);
CREATE INDEX idx_enrollment_cache_status     ON ENROLLMENT_CACHE(STATUS);

CREATE TABLE STUDENT_FEE_CYCLES (
    ID                 UUID           NOT NULL,
    STUDENT_ID         UUID           NOT NULL,
    BILLING_MONTH      INT            NOT NULL,
    BILLING_YEAR       INT            NOT NULL,
    TOTAL_AMOUNT       NUMERIC(12,2)  NOT NULL,
    PAID_AMOUNT        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    OUTSTANDING_AMOUNT NUMERIC(12,2)  NOT NULL,
    STATUS             VARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    GENERATED_DATE     TIMESTAMP,
    DUE_DATE           TIMESTAMP,
    CONSTRAINT pk_student_fee_cycles PRIMARY KEY (ID),
    CONSTRAINT uq_student_fee_cycles_student_month_year UNIQUE (STUDENT_ID, BILLING_MONTH, BILLING_YEAR),
    CONSTRAINT chk_student_fee_cycles_status CHECK (STATUS IN ('PAID','PARTIAL','UNPAID')),
    CONSTRAINT chk_student_fee_cycles_billing_month CHECK (BILLING_MONTH BETWEEN 1 AND 12),
    CONSTRAINT chk_student_fee_cycles_billing_year CHECK (BILLING_YEAR >= 2000)
);
CREATE INDEX idx_student_fee_cycles_student_id     ON STUDENT_FEE_CYCLES(STUDENT_ID);
CREATE INDEX idx_student_fee_cycles_status         ON STUDENT_FEE_CYCLES(STATUS);
CREATE INDEX idx_student_fee_cycles_student_status ON STUDENT_FEE_CYCLES(STUDENT_ID, STATUS);

CREATE TABLE STUDENT_FEE_DETAILS (
    ID                    UUID           NOT NULL,
    FEE_CYCLE_ID          UUID           NOT NULL,
    STUDENT_ID            UUID           NOT NULL,
    ENROLLMENT_ID         UUID           NOT NULL,
    COURSE_ID             UUID           NOT NULL,
    COURSE_FEE            NUMERIC(12,2)  NOT NULL,
    ALLOCATED_PAID_AMOUNT NUMERIC(12,2)  NOT NULL DEFAULT 0,
    OUTSTANDING_AMOUNT    NUMERIC(12,2)  NOT NULL,
    STATUS                VARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    CONSTRAINT pk_student_fee_details PRIMARY KEY (ID),
    CONSTRAINT fk_student_fee_details_cycle FOREIGN KEY (FEE_CYCLE_ID) REFERENCES STUDENT_FEE_CYCLES(ID) ON DELETE CASCADE,
    CONSTRAINT uq_student_fee_details_cycle_enrollment UNIQUE (FEE_CYCLE_ID, ENROLLMENT_ID),
    CONSTRAINT chk_student_fee_details_status CHECK (STATUS IN ('PAID','PARTIAL','UNPAID'))
);
CREATE INDEX idx_student_fee_details_fee_cycle_id ON STUDENT_FEE_DETAILS(FEE_CYCLE_ID);
CREATE INDEX idx_student_fee_details_student_id   ON STUDENT_FEE_DETAILS(STUDENT_ID);
CREATE INDEX idx_student_fee_details_enrollment_id ON STUDENT_FEE_DETAILS(ENROLLMENT_ID);

CREATE TABLE PAYMENTS (
    ID                    UUID           NOT NULL,
    FEE_CYCLE_ID          UUID           NOT NULL,
    STUDENT_ID            UUID           NOT NULL,
    AMOUNT                NUMERIC(12,2)  NOT NULL,
    PAYMENT_MODE          VARCHAR(50)    NOT NULL,
    TRANSACTION_REFERENCE VARCHAR(200),
    PAYMENT_DATE          TIMESTAMP,
    REMARKS               TEXT,
    CONSTRAINT pk_payments PRIMARY KEY (ID),
    CONSTRAINT fk_payments_fee_cycle FOREIGN KEY (FEE_CYCLE_ID) REFERENCES STUDENT_FEE_CYCLES(ID),
    CONSTRAINT chk_payments_amount CHECK (AMOUNT > 0)
);
CREATE INDEX idx_payments_student_id   ON PAYMENTS(STUDENT_ID);
CREATE INDEX idx_payments_fee_cycle_id ON PAYMENTS(FEE_CYCLE_ID);

CREATE TABLE PAYMENT_ALLOCATIONS (
    ID               UUID           NOT NULL,
    PAYMENT_ID       UUID           NOT NULL,
    FEE_DETAIL_ID    UUID           NOT NULL,
    ALLOCATED_AMOUNT NUMERIC(12,2)  NOT NULL,
    CONSTRAINT pk_payment_allocations PRIMARY KEY (ID),
    CONSTRAINT fk_payment_allocations_payment FOREIGN KEY (PAYMENT_ID) REFERENCES PAYMENTS(ID) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocations_fee_detail FOREIGN KEY (FEE_DETAIL_ID) REFERENCES STUDENT_FEE_DETAILS(ID),
    CONSTRAINT chk_payment_allocations_allocated_amount CHECK (ALLOCATED_AMOUNT > 0)
);
CREATE INDEX idx_payment_allocations_payment_id    ON PAYMENT_ALLOCATIONS(PAYMENT_ID);
CREATE INDEX idx_payment_allocations_fee_detail_id ON PAYMENT_ALLOCATIONS(FEE_DETAIL_ID);
