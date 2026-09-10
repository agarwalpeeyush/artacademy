-- V7__rename_schedules_to_timetables.sql
-- Standardise nomenclature: the "schedule" tables/indexes/constraints ARE the timetable.
ALTER TABLE SCHEDULES RENAME TO TIMETABLES;

ALTER INDEX idx_schedules_teacher_id  RENAME TO idx_timetables_teacher_id;
ALTER INDEX idx_schedules_class_id    RENAME TO idx_timetables_class_id;
ALTER INDEX idx_schedules_room_id     RENAME TO idx_timetables_room_id;
ALTER INDEX idx_schedules_day_of_week RENAME TO idx_timetables_day_of_week;
ALTER INDEX idx_schedules_status      RENAME TO idx_timetables_status;

ALTER TABLE TIMETABLES RENAME CONSTRAINT fk_schedules_room TO fk_timetables_room;
