-- Course-enrollment service schema (academic_db).

-- Open-ended course-type catalog. New types are added as data, not code.
CREATE TABLE COURSE_TYPES (
    ID     UUID PRIMARY KEY,
    CODE   VARCHAR(50) NOT NULL UNIQUE,
    NAME   VARCHAR(255) NOT NULL,
    STATUS VARCHAR(255) NOT NULL
);

-- Open-ended course fee-type catalog. New fee types are added as data, not code.
CREATE TABLE COURSE_FEE_TYPES (
    CODE      VARCHAR(50) NOT NULL PRIMARY KEY,
    NAME      VARCHAR(255) NOT NULL,
    FREQUENCY VARCHAR(20) NOT NULL,
    STATUS    VARCHAR(255) NOT NULL
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

-- Per-course fee catalog. Each course carries a set of fees; cadence is RECURRING or ONE_TIME.
-- FEE_TYPE references the COURSE_FEE_TYPES catalog by CODE. INSTITUTE_SHARE_* is the template
-- default for the institute cut on this line (null type means no cut).
CREATE TABLE COURSE_FEES (
    ID                    UUID PRIMARY KEY,
    COURSE_ID             UUID NOT NULL,
    FEE_TYPE              VARCHAR(50) NOT NULL,
    AMOUNT                NUMERIC(12, 2) NOT NULL,
    CADENCE               VARCHAR(20) NOT NULL,
    INSTITUTE_SHARE_TYPE  VARCHAR(10) NULL,
    INSTITUTE_SHARE_VALUE NUMERIC(12, 2) NULL DEFAULT 0,
    CONSTRAINT fk_course_fees_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID),
    CONSTRAINT fk_course_fees_fee_type FOREIGN KEY (FEE_TYPE) REFERENCES COURSE_FEE_TYPES (CODE),
    CONSTRAINT uq_course_fee_type UNIQUE (COURSE_ID, FEE_TYPE)
);

CREATE INDEX idx_course_fees_course_id ON COURSE_FEES (COURSE_ID);

-- Enrollment stores its teacher directly (F5). Admission is tracked as an ADMISSION line in
-- ENROLLMENT_FEES, so there is no standalone admission-paid boolean.
CREATE TABLE ENROLLMENTS (
    ID              UUID PRIMARY KEY,
    STUDENT_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    TEACHER_ID      UUID NOT NULL,
    ENROLLMENT_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    CONSTRAINT uq_enrollment_student_course UNIQUE (STUDENT_ID, COURSE_ID),
    CONSTRAINT fk_enrollments_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID)
);

CREATE INDEX idx_enrollments_student_id ON ENROLLMENTS (STUDENT_ID);
CREATE INDEX idx_enrollments_course_id ON ENROLLMENTS (COURSE_ID);

-- Per-enrollment, overridable fee lines (R8). At enroll time the course's COURSE_FEES rows are
-- copied here; the teacher may override any amount. The enrollment (not the course) is the source
-- of truth for what a given student is billed. DUE_DATE is computed at enroll time from the cadence
-- and independently overridable. INSTITUTE_SHARE_* is the per-child institute-share rule (F3).
CREATE TABLE ENROLLMENT_FEES (
    ID                    UUID PRIMARY KEY,
    ENROLLMENT_ID         UUID NOT NULL,
    FEE_TYPE              VARCHAR(50) NOT NULL,
    AMOUNT                NUMERIC(12, 2) NOT NULL,
    CADENCE               VARCHAR(20) NOT NULL,
    DUE_DATE              DATE,
    INSTITUTE_SHARE_TYPE  VARCHAR(10) NULL,
    INSTITUTE_SHARE_VALUE NUMERIC(12, 2) NULL DEFAULT 0,
    CONSTRAINT fk_enrollment_fees_enrollment FOREIGN KEY (ENROLLMENT_ID) REFERENCES ENROLLMENTS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_fees_fee_type FOREIGN KEY (FEE_TYPE) REFERENCES COURSE_FEE_TYPES (CODE),
    CONSTRAINT uq_enrollment_fee_type UNIQUE (ENROLLMENT_ID, FEE_TYPE)
);

CREATE INDEX idx_enrollment_fees_enrollment_id ON ENROLLMENT_FEES (ENROLLMENT_ID);

-- Exam scheduling.
CREATE TABLE EXAMS (
    ID         UUID PRIMARY KEY,
    COURSE_ID  UUID NOT NULL,
    TITLE      VARCHAR(255),
    EXAM_DATE  DATE NOT NULL,
    START_TIME TIME NOT NULL,
    END_TIME   TIME NOT NULL,
    STATUS     VARCHAR(255) NOT NULL,
    CONSTRAINT fk_exams_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID)
);

CREATE INDEX idx_exams_course_id ON EXAMS (COURSE_ID);

-- Timetable scheduling. A timetable is a recurring weekly slot for a COURSE: a course runs on
-- multiple days/times and children are assigned to a subset of these slots.
CREATE TABLE TIMETABLES (
    ID          UUID PRIMARY KEY,
    COURSE_ID   UUID NOT NULL,
    TEACHER_ID  UUID NOT NULL,
    START_TIME  TIME NOT NULL,
    END_TIME    TIME NOT NULL,
    DAY_OF_WEEK VARCHAR(20) NOT NULL,
    CONSTRAINT fk_timetables_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID)
);

CREATE INDEX idx_timetables_teacher_id ON TIMETABLES (TEACHER_ID);
CREATE INDEX idx_timetables_course_id ON TIMETABLES (COURSE_ID);
CREATE INDEX idx_timetables_day_of_week ON TIMETABLES (DAY_OF_WEEK);

-- Per-child timetable assignment (R9). A child enrolled in a course is assigned to a subset of
-- that course's recurring TIMETABLES slots (their regular weekly schedule). The session roster
-- for a (course, slot, date) derives from this join.
CREATE TABLE ENROLLMENT_TIMETABLES (
    ENROLLMENT_ID UUID NOT NULL,
    TIMETABLE_ID  UUID NOT NULL,
    PRIMARY KEY (ENROLLMENT_ID, TIMETABLE_ID),
    CONSTRAINT fk_enrollment_timetables_enrollment FOREIGN KEY (ENROLLMENT_ID) REFERENCES ENROLLMENTS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_timetables_timetable FOREIGN KEY (TIMETABLE_ID) REFERENCES TIMETABLES (ID) ON DELETE CASCADE
);

CREATE INDEX idx_enrollment_timetables_timetable_id ON ENROLLMENT_TIMETABLES (TIMETABLE_ID);

-- Standard course types. Reference/master data, not dev seed. New types can be added at runtime
-- via the course-type API.
INSERT INTO COURSE_TYPES (ID, CODE, NAME, STATUS) VALUES
    ('00000000-0000-0000-0100-000000000001', 'DRAWING',            'Drawing',           'ACTIVE'),
    ('00000000-0000-0000-0100-000000000002', 'ACADEMICS',          'Academics',         'ACTIVE'),
    ('00000000-0000-0000-0100-000000000003', 'EXAMINATION',        'Examination',       'ACTIVE'),
    ('00000000-0000-0000-0100-000000000004', 'SPECIALIZED_CRAFT',  'Specialized Craft', 'ACTIVE');

-- Standard course fee types. Reference/master data, not dev seed.
INSERT INTO COURSE_FEE_TYPES (CODE, NAME, FREQUENCY, STATUS) VALUES
    ('ADMISSION',           'Admission',           'ONE_TIME',  'ACTIVE'),
    ('MONTHLY',             'Monthly',             'RECURRING', 'ACTIVE'),
    ('EXAM',                'Exam',                'ONE_TIME',  'ACTIVE'),
    ('ONE_TIME_SHORT_TERM', 'One Time Short Term', 'ONE_TIME',  'ACTIVE');
