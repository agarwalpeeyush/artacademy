-- V4__teacher_availability_exceptions.sql

CREATE TABLE TEACHER_AVAILABILITY_EXCEPTIONS (
    ID                  UUID        PRIMARY KEY,
    TEACHER_ID          UUID        NOT NULL,
    EXCEPTION_DATE      DATE        NOT NULL,
    REASON              VARCHAR(255),
    UNAVAILABLE_ALL_DAY BOOLEAN     NOT NULL DEFAULT TRUE,
    START_TIME          TIME,
    END_TIME            TIME,
    CONSTRAINT fk_availability_exceptions_teacher FOREIGN KEY (TEACHER_ID)
        REFERENCES TEACHERS(ID) ON DELETE CASCADE
);

CREATE INDEX idx_availability_exceptions_teacher_id ON TEACHER_AVAILABILITY_EXCEPTIONS(TEACHER_ID);
