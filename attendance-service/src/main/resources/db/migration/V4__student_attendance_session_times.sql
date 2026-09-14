-- Persist the actual session start/end time on each student-attendance record. The times prefill
-- from the batch's timetable slot but are editable and recorded here (the timetable is unchanged).
-- Additive and nullable; the upsert key stays (student_id, timetable_id, attendance_date). Dev DBs
-- are reseeded, so no backfill.

ALTER TABLE STUDENT_ATTENDANCE ADD COLUMN START_TIME TIME;
ALTER TABLE STUDENT_ATTENDANCE ADD COLUMN END_TIME TIME;
