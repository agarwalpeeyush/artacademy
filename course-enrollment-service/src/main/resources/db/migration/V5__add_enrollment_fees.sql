-- R8: per-enrollment, overridable fee lines. At enroll time the course's COURSE_FEES
-- rows are copied here; the teacher may override any amount. The enrollment (not the
-- course) is the source of truth for what a given student is billed.
CREATE TABLE ENROLLMENT_FEES (
    ID            UUID PRIMARY KEY,
    ENROLLMENT_ID UUID NOT NULL,
    FEE_TYPE      VARCHAR(50) NOT NULL,
    AMOUNT        NUMERIC(12,2) NOT NULL,
    CADENCE       VARCHAR(20) NOT NULL,
    CONSTRAINT fk_enrollment_fees_enrollment FOREIGN KEY (ENROLLMENT_ID) REFERENCES ENROLLMENTS (ID) ON DELETE CASCADE,
    CONSTRAINT uq_enrollment_fee_type UNIQUE (ENROLLMENT_ID, FEE_TYPE)
);

CREATE INDEX idx_enrollment_fees_enrollment_id ON ENROLLMENT_FEES (ENROLLMENT_ID);
