-- R9: per-child timetable assignment. A child enrolled in a course is assigned to a
-- subset of that course's recurring TIMETABLES slots (their regular weekly schedule).
-- The session roster for a (course, slot, date) derives from this join.
CREATE TABLE ENROLLMENT_TIMETABLES (
    ENROLLMENT_ID UUID NOT NULL,
    TIMETABLE_ID  UUID NOT NULL,
    PRIMARY KEY (ENROLLMENT_ID, TIMETABLE_ID),
    CONSTRAINT fk_enrollment_timetables_enrollment FOREIGN KEY (ENROLLMENT_ID) REFERENCES ENROLLMENTS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_timetables_timetable FOREIGN KEY (TIMETABLE_ID) REFERENCES TIMETABLES (ID) ON DELETE CASCADE
);

CREATE INDEX idx_enrollment_timetables_timetable_id ON ENROLLMENT_TIMETABLES (TIMETABLE_ID);
