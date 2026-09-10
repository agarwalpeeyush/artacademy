-- V6__drop_schedule_versions.sql
-- Timetable version history was removed; drop the now-unused snapshot tables.

DROP TABLE IF EXISTS SCHEDULE_VERSION_ENTRIES;
DROP TABLE IF EXISTS SCHEDULE_VERSIONS;
