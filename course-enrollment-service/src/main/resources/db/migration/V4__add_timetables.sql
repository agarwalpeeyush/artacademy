-- Timetable scheduling, moved from timetable-service into academic_db.
CREATE TABLE TIMETABLES (
    ID           UUID PRIMARY KEY,
    CLASS_ID     UUID NOT NULL,
    TEACHER_ID   UUID NOT NULL,
    START_TIME   TIME NOT NULL,
    END_TIME     TIME NOT NULL,
    DAY_OF_WEEK  VARCHAR(20) NOT NULL
);

CREATE INDEX idx_timetables_teacher_id ON TIMETABLES (TEACHER_ID);
CREATE INDEX idx_timetables_class_id ON TIMETABLES (CLASS_ID);
CREATE INDEX idx_timetables_day_of_week ON TIMETABLES (DAY_OF_WEEK);
