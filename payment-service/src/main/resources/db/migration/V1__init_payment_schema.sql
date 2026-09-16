-- Payment service schema (payment_db). Single migration for the fee-lifecycle model:
-- STUDENT_FEE (enrollment header) → STUDENT_FEE_DETAIL (editable fee catalogue)
-- → FEE_BILLS (per-period payable, carries revenue share) ; PAYMENTS (student-level)
-- + STUDENT_CREDIT (over-payment balance). No enrollment_cache, no payment_allocations.

CREATE TABLE STUDENT_FEE (
    ENROLLMENT_ID UUID PRIMARY KEY,
    STUDENT_ID    UUID NOT NULL,
    COURSE_ID     UUID NOT NULL,
    TEACHER_ID    UUID,
    STATUS        VARCHAR(20) NOT NULL
);

CREATE INDEX idx_student_fee_student_id ON STUDENT_FEE (STUDENT_ID);
CREATE INDEX idx_student_fee_teacher_id ON STUDENT_FEE (TEACHER_ID);

CREATE TABLE STUDENT_FEE_DETAIL (
    ID                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ENROLLMENT_ID         UUID NOT NULL,
    FEE_TYPE              VARCHAR(30) NOT NULL,
    AMOUNT                NUMERIC(12, 2) NOT NULL,
    CADENCE               VARCHAR(20) NOT NULL,
    DUE_DATE              DATE,
    INSTITUTE_SHARE_TYPE  VARCHAR(10),
    INSTITUTE_SHARE_VALUE NUMERIC(12, 2),
    CONSTRAINT uq_student_fee_detail_enrollment_type UNIQUE (ENROLLMENT_ID, FEE_TYPE),
    CONSTRAINT fk_student_fee_detail_enrollment FOREIGN KEY (ENROLLMENT_ID)
        REFERENCES STUDENT_FEE (ENROLLMENT_ID) ON DELETE CASCADE
);

CREATE INDEX idx_student_fee_detail_enrollment ON STUDENT_FEE_DETAIL (ENROLLMENT_ID);

CREATE TABLE FEE_BILLS (
    ID                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ENROLLMENT_ID            UUID NOT NULL,
    STUDENT_ID               UUID NOT NULL,
    BILLING_MONTH            INTEGER NOT NULL,
    BILLING_YEAR             INTEGER NOT NULL,
    FEE_TYPE                 VARCHAR(30) NOT NULL,
    CADENCE                  VARCHAR(20) NOT NULL,
    AMOUNT_DUE               NUMERIC(12, 2) NOT NULL,
    PAID_AMOUNT              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    OUTSTANDING_AMOUNT       NUMERIC(12, 2) NOT NULL,
    STATUS                   VARCHAR(20) NOT NULL,
    GENERATED_DATE           TIMESTAMP,
    DUE_DATE                 TIMESTAMP,
    PAYMENT_DATE             TIMESTAMP,
    OUTSTANDING_BILL         BOOLEAN NOT NULL DEFAULT TRUE,
    TEACHER_ID               UUID,
    INSTITUTE_SHARE_TYPE     VARCHAR(10),
    INSTITUTE_SHARE_VALUE    NUMERIC(12, 2),
    INSTITUTE_SHARE_AMOUNT   NUMERIC(12, 2),
    TEACHER_SHARE_AMOUNT     NUMERIC(12, 2),
    OVERRIDE_INSTITUTE_SHARE NUMERIC(12, 2),
    OVERRIDE_TEACHER_SHARE   NUMERIC(12, 2),
    OVERRIDDEN_BY            UUID,
    OVERRIDDEN_AT           TIMESTAMP,
    CONSTRAINT uq_fee_bills_enrollment_type_period UNIQUE (ENROLLMENT_ID, FEE_TYPE, BILLING_MONTH, BILLING_YEAR)
);

CREATE INDEX idx_fee_bills_student_id ON FEE_BILLS (STUDENT_ID);
CREATE INDEX idx_fee_bills_student_outstanding ON FEE_BILLS (STUDENT_ID, OUTSTANDING_BILL);
CREATE INDEX idx_fee_bills_teacher_id ON FEE_BILLS (TEACHER_ID);

CREATE TABLE PAYMENTS (
    ID                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID            UUID NOT NULL,
    AMOUNT                NUMERIC(12, 2) NOT NULL,
    PAYMENT_MODE          VARCHAR(50),
    TRANSACTION_REFERENCE VARCHAR(200),
    PAYMENT_DATE          TIMESTAMP,
    REMARKS               TEXT
);

CREATE INDEX idx_payments_student_id ON PAYMENTS (STUDENT_ID);

CREATE TABLE STUDENT_CREDIT (
    STUDENT_ID UUID PRIMARY KEY,
    BALANCE    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    UPDATED_AT TIMESTAMP
);
