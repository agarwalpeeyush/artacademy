-- Course-enrollment service schema (academic_db).

-- Open-ended course-type catalog (R4). New types are added as data, not code.
CREATE TABLE COURSE_TYPES (
    ID     UUID PRIMARY KEY,
    CODE   VARCHAR(50) NOT NULL UNIQUE,
    NAME   VARCHAR(255) NOT NULL,
    STATUS VARCHAR(255) NOT NULL
);

CREATE TABLE COURSES (
    ID              UUID PRIMARY KEY,
    COURSE_CODE     VARCHAR(50) NOT NULL UNIQUE,
    COURSE_NAME     VARCHAR(255) NOT NULL,
    COURSE_TYPE_ID  UUID,
    DESCRIPTION     TEXT,
    DURATION_MONTHS INTEGER,
    STATUS          VARCHAR(255) NOT NULL,
    CONSTRAINT fk_courses_type FOREIGN KEY (COURSE_TYPE_ID) REFERENCES COURSE_TYPES (ID)
);

CREATE INDEX idx_courses_type_id ON COURSES (COURSE_TYPE_ID);

-- Per-course fee catalog (R5). Each course carries a set of fees; cadence is RECURRING or ONE_TIME.
CREATE TABLE COURSE_FEES (
    ID        UUID PRIMARY KEY,
    COURSE_ID UUID NOT NULL,
    FEE_TYPE  VARCHAR(50) NOT NULL,
    AMOUNT    NUMERIC(12, 2) NOT NULL,
    CADENCE   VARCHAR(20) NOT NULL,
    CONSTRAINT fk_course_fees_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID),
    CONSTRAINT uq_course_fee_type UNIQUE (COURSE_ID, FEE_TYPE)
);

CREATE INDEX idx_course_fees_course_id ON COURSE_FEES (COURSE_ID);

CREATE TABLE ENROLLMENTS (
    ID              UUID PRIMARY KEY,
    STUDENT_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    ENROLLMENT_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    ADMISSION_FEE_PAID BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_enrollment_student_course UNIQUE (STUDENT_ID, COURSE_ID),
    CONSTRAINT fk_enrollments_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID)
);

CREATE INDEX idx_enrollments_student_id ON ENROLLMENTS (STUDENT_ID);
CREATE INDEX idx_enrollments_course_id ON ENROLLMENTS (COURSE_ID);

-- Standard course types (R4). Reference/master data, not dev seed — kept through the R17 reset.
-- New types can be added at runtime via the course-type API.
INSERT INTO COURSE_TYPES (ID, CODE, NAME, STATUS) VALUES
    ('00000000-0000-0000-0100-000000000001', 'DRAWING',            'Drawing',           'ACTIVE'),
    ('00000000-0000-0000-0100-000000000002', 'ACADEMICS',          'Academics',         'ACTIVE'),
    ('00000000-0000-0000-0100-000000000003', 'EXAMINATION',        'Examination',       'ACTIVE'),
    ('00000000-0000-0000-0100-000000000004', 'SPECIALIZED_CRAFT',  'Specialized Craft', 'ACTIVE');
