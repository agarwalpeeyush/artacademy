-- User service schema (user_db). GREENFIELD Person + role-profiles model (no JOINED inheritance).
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

-- Availability tables keep their shape; TEACHER_ID now references PERSONS(ID) (a person holding a TeacherProfile).
CREATE TABLE TEACHER_AVAILABILITY (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID  UUID NOT NULL,
    DAY_OF_WEEK VARCHAR(255),
    START_TIME  TIME,
    END_TIME    TIME,
    CONSTRAINT fk_availability_teacher FOREIGN KEY (TEACHER_ID) REFERENCES PERSONS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_availability_teacher_id ON TEACHER_AVAILABILITY (TEACHER_ID);

CREATE TABLE TEACHER_AVAILABILITY_EXCEPTIONS (
    ID                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID          UUID NOT NULL,
    EXCEPTION_DATE      DATE NOT NULL,
    REASON              VARCHAR(255),
    UNAVAILABLE_ALL_DAY BOOLEAN NOT NULL,
    START_TIME          TIME,
    END_TIME            TIME,
    CONSTRAINT fk_availability_exceptions_teacher FOREIGN KEY (TEACHER_ID) REFERENCES PERSONS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_availability_exceptions_teacher_id ON TEACHER_AVAILABILITY_EXCEPTIONS (TEACHER_ID);
