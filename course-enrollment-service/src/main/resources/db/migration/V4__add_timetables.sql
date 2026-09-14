-- Timetable scheduling, moved from timetable-service into academic_db.
-- A timetable is a recurring weekly slot for a COURSE (R4): a course runs on
-- multiple days/times and children are assigned to a subset of these slots.
CREATE TABLE TIMETABLES (
    ID           UUID PRIMARY KEY,
    COURSE_ID    UUID NOT NULL,
    TEACHER_ID   UUID NOT NULL,
    START_TIME   TIME NOT NULL,
    END_TIME     TIME NOT NULL,
    DAY_OF_WEEK  VARCHAR(20) NOT NULL,
    CONSTRAINT fk_timetables_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID)
);

CREATE INDEX idx_timetables_teacher_id ON TIMETABLES (TEACHER_ID);
CREATE INDEX idx_timetables_course_id ON TIMETABLES (COURSE_ID);
CREATE INDEX idx_timetables_day_of_week ON TIMETABLES (DAY_OF_WEEK);
