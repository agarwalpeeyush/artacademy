-- Course-enrollment service schema (academic_db).
-- Consolidated migration: academic + user + attendance + payment tables live in one database
-- after the four services were merged into course-enrollment-service. No cross-domain FKs
-- (all cross-domain references are bare UUIDs), so the schemas concatenate cleanly.

-- ============================================================================
-- ACADEMIC
-- ============================================================================

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

-- ============================================================================
-- USER (Person + role-profiles model)
-- ============================================================================
-- One PERSONS row per human; zero-or-one of each profile (teacher/student/parent) hangs off it, so
-- roles accumulate on a single account. Phone is an indexed LOOKUP key (D2), never unique. Login_id
-- is a credential that may change on staff promotion (D3); identity is the stable PERSONS.ID (== auth User.id).

CREATE TABLE PERSONS (
    ID           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    LOGIN_ID     VARCHAR(255) UNIQUE,
    FIRST_NAME   VARCHAR(255) NOT NULL,
    LAST_NAME    VARCHAR(255),
    EMAIL        VARCHAR(255),
    PHONE_NUMBER VARCHAR(255),
    STATUS       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    -- Elevated roles that have NO profile (PRINCIPAL/ADMIN), granted explicitly (OQ2). Comma-joined.
    -- Effective roles = {role per profile held} ∪ {these}.
    ELEVATED_ROLES VARCHAR(255)
);

CREATE INDEX idx_persons_phone ON PERSONS (PHONE_NUMBER);
CREATE INDEX idx_persons_login ON PERSONS (LOGIN_ID);

CREATE TABLE TEACHER_PROFILES (
    PERSON_ID     UUID PRIMARY KEY,
    EMPLOYEE_CODE VARCHAR(50) UNIQUE,
    QUALIFICATION VARCHAR(255),
    JOINING_DATE  DATE,
    STATUS        VARCHAR(20) NOT NULL,
    CONSTRAINT fk_teacher_profile_person FOREIGN KEY (PERSON_ID) REFERENCES PERSONS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_teacher_profiles_employee_code ON TEACHER_PROFILES (EMPLOYEE_CODE);

CREATE TABLE STUDENT_PROFILES (
    PERSON_ID       UUID PRIMARY KEY,
    DATE_OF_BIRTH   DATE,
    ADDRESS         TEXT,
    SCHOOL_NAME     VARCHAR(255),
    CLASS_NAME      VARCHAR(100),
    ENROLLMENT_DATE DATE,
    STATUS          VARCHAR(20) NOT NULL,
    -- Denormalized non-login guardian (D4): the "other parent" (e.g. father when the mother holds
    -- the login) is stored inline here, not as a Person or a GUARDIANSHIPS edge.
    OTHER_PARENT_NAME  VARCHAR(255),
    OTHER_PARENT_PHONE VARCHAR(30),
    OTHER_PARENT_REL   VARCHAR(20),
    CONSTRAINT fk_student_profile_person FOREIGN KEY (PERSON_ID) REFERENCES PERSONS (ID) ON DELETE CASCADE
);

CREATE TABLE PARENT_PROFILES (
    PERSON_ID  UUID PRIMARY KEY,
    OCCUPATION VARCHAR(255),
    STATUS     VARCHAR(20) NOT NULL,
    CONSTRAINT fk_parent_profile_person FOREIGN KEY (PERSON_ID) REFERENCES PERSONS (ID) ON DELETE CASCADE
);

-- Only login-holding guardians get a row (D4). Parent<->child edge across two PERSONS.
CREATE TABLE GUARDIANSHIPS (
    GUARDIAN_PERSON_ID UUID NOT NULL,
    STUDENT_PERSON_ID  UUID NOT NULL,
    RELATIONSHIP       VARCHAR(20),
    PRIMARY KEY (GUARDIAN_PERSON_ID, STUDENT_PERSON_ID),
    CONSTRAINT fk_guardian FOREIGN KEY (GUARDIAN_PERSON_ID) REFERENCES PERSONS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_ward     FOREIGN KEY (STUDENT_PERSON_ID)  REFERENCES PERSONS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_guardianship_student ON GUARDIANSHIPS (STUDENT_PERSON_ID);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================

-- STUDENT_ATTENDANCE is keyed by (student_id, timetable_id, attendance_date) with course_id as a
-- scope column. START_TIME/END_TIME record the actual session times (prefilled from the timetable
-- slot, editable per record).
CREATE TABLE STUDENT_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    TIMETABLE_ID    UUID NOT NULL,
    ATTENDANCE_DATE DATE NOT NULL,
    START_TIME      TIME,
    END_TIME        TIME,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_student_attendance UNIQUE (STUDENT_ID, TIMETABLE_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_student_attendance_student_date ON STUDENT_ATTENDANCE (STUDENT_ID, ATTENDANCE_DATE);
CREATE INDEX idx_student_attendance_timetable_date ON STUDENT_ATTENDANCE (TIMETABLE_ID, ATTENDANCE_DATE);

-- TEACHER_ATTENDANCE is keyed by (teacher_id, timetable_id, attendance_date) with course_id scope.
CREATE TABLE TEACHER_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    TIMETABLE_ID    UUID NOT NULL,
    ATTENDANCE_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_teacher_attendance UNIQUE (TEACHER_ID, TIMETABLE_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_teacher_attendance_date ON TEACHER_ATTENDANCE (ATTENDANCE_DATE);
CREATE INDEX idx_teacher_attendance_timetable_date ON TEACHER_ATTENDANCE (TIMETABLE_ID, ATTENDANCE_DATE);

-- Audit log of direct attendance edits (R16). No request/approve/reject workflow: one row is
-- appended per edit capturing old->new status, who made it, their role, and when.
CREATE TABLE ATTENDANCE_CORRECTION (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ATTENDANCE_TYPE   VARCHAR(20) NOT NULL,
    ATTENDANCE_ID     UUID NOT NULL,
    SUBJECT_ID        UUID NOT NULL,
    TIMETABLE_ID      UUID NOT NULL,
    ATTENDANCE_DATE   DATE NOT NULL,
    OLD_STATUS        VARCHAR(20) NOT NULL,
    NEW_STATUS        VARCHAR(20) NOT NULL,
    REASON            TEXT,
    EDITED_BY_USER_ID UUID NOT NULL,
    EDITOR_ROLE       VARCHAR(20) NOT NULL,
    EDITED_AT         TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_correction_attendance ON ATTENDANCE_CORRECTION (ATTENDANCE_ID);
CREATE INDEX idx_correction_subject ON ATTENDANCE_CORRECTION (SUBJECT_ID);
CREATE INDEX idx_correction_editor ON ATTENDANCE_CORRECTION (EDITED_BY_USER_ID);

-- ============================================================================
-- PAYMENT (fee-lifecycle model)
-- ============================================================================
-- STUDENT_FEE (enrollment header) → STUDENT_FEE_DETAIL (editable fee catalogue)
-- → FEE_BILLS (per-period payable, carries revenue share) ; PAYMENTS (student-level)
-- + STUDENT_CREDIT (over-payment balance).

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

-- ============================================================================
-- REFERENCE DATA + SEED
-- ============================================================================

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

-- Bootstrap seed: the single standing admin. ID matches the auth_db admin user. A PERSONS row with
-- no role-profile; its ADMIN role is granted in auth_db, not derived from a profile here.
INSERT INTO PERSONS (ID, LOGIN_ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE_NUMBER, STATUS) VALUES
    ('00000000-0000-0000-0001-000000000001', 'admin', 'Bootstrap', 'Admin', 'admin@artacademy.test', NULL, 'ACTIVE')
ON CONFLICT (ID) DO NOTHING;
