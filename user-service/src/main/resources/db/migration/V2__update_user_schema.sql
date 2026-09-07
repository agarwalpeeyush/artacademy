-- V2__update_user_schema.sql
-- Redesign: JOINED inheritance with USERS as base table, uppercase column names

DROP TABLE IF EXISTS teacher_availability CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Base table for all users (JOINED inheritance)
CREATE TABLE USERS
(
    ID         UUID         PRIMARY KEY,
    USER_TYPE  VARCHAR(31)  NOT NULL,
    LOGIN_ID   VARCHAR(255) UNIQUE,
    FIRST_NAME VARCHAR(255) NOT NULL,
    LAST_NAME  VARCHAR(255)
);

CREATE INDEX idx_users_login_id ON USERS (LOGIN_ID);

-- ----------------------------------------------------------------

CREATE TABLE STUDENTS
(
    ID              UUID         PRIMARY KEY,
    DATE_OF_BIRTH   DATE,
    FATHER_NAME     VARCHAR(255),
    FATHER_PHONE    VARCHAR(50),
    MOTHER_NAME     VARCHAR(255),
    MOTHER_PHONE    VARCHAR(50),
    GUARDIAN_NAME   VARCHAR(255),
    GUARDIAN_PHONE  VARCHAR(50),
    EMAIL           VARCHAR(255),
    ADDRESS         TEXT,
    ENROLLMENT_DATE DATE,
    STATUS          VARCHAR(50)  NOT NULL,
    CONSTRAINT fk_students_user FOREIGN KEY (ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

-- ----------------------------------------------------------------

CREATE TABLE TEACHERS
(
    ID            UUID         PRIMARY KEY,
    EMPLOYEE_CODE VARCHAR(50)  UNIQUE,
    EMAIL         VARCHAR(255),
    PHONE         VARCHAR(50),
    QUALIFICATION VARCHAR(500),
    JOINING_DATE  DATE,
    STATUS        VARCHAR(50)  NOT NULL,
    CONSTRAINT fk_teachers_user FOREIGN KEY (ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_teachers_employee_code ON TEACHERS (EMPLOYEE_CODE);

-- ----------------------------------------------------------------

CREATE TABLE TEACHER_AVAILABILITY
(
    ID          UUID        PRIMARY KEY,
    TEACHER_ID  UUID        NOT NULL,
    DAY_OF_WEEK VARCHAR(20) NOT NULL,
    START_TIME  TIME        NOT NULL,
    END_TIME    TIME        NOT NULL,
    CONSTRAINT fk_availability_teacher
        FOREIGN KEY (TEACHER_ID) REFERENCES TEACHERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_availability_teacher_id ON TEACHER_AVAILABILITY (TEACHER_ID);
