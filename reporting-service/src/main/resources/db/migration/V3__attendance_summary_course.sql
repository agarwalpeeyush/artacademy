-- V3__attendance_summary_course.sql
-- Course dimension on attendance summaries (nullable, additive).
-- Existing rows without a course fall into an "Unassigned" bucket at query time.
ALTER TABLE ATTENDANCE_SUMMARY ADD COLUMN COURSE_ID UUID;
ALTER TABLE ATTENDANCE_SUMMARY ADD COLUMN COURSE_NAME VARCHAR(200);
