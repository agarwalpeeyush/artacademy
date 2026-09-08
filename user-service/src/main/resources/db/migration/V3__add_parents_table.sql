-- V3__add_parents_table.sql
-- Parent profile child table (JOINED inheritance under USERS)

CREATE TABLE PARENTS
(
    ID           UUID         PRIMARY KEY,
    RELATIONSHIP VARCHAR(50),
    PHONE        VARCHAR(50),
    EMAIL        VARCHAR(255),
    ADDRESS      TEXT,
    OCCUPATION   VARCHAR(255),
    STUDENT_ID   UUID,
    STATUS       VARCHAR(50)  NOT NULL,
    CONSTRAINT fk_parents_user FOREIGN KEY (ID) REFERENCES USERS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_parents_student FOREIGN KEY (STUDENT_ID) REFERENCES STUDENTS (ID)
);

CREATE INDEX idx_parents_student_id ON PARENTS (STUDENT_ID);
