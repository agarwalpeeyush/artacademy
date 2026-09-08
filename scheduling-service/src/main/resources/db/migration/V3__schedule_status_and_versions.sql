-- V3__schedule_status_and_versions.sql

ALTER TABLE SCHEDULES
    ADD COLUMN STATUS VARCHAR(20) NOT NULL DEFAULT 'DRAFT';

ALTER TABLE SCHEDULES
    ADD COLUMN PUBLISHED_AT TIMESTAMP NULL;

-- Existing schedules predate the draft/publish workflow; treat them as already published
-- so students/teachers keep seeing timetables that were live before this migration.
UPDATE SCHEDULES SET STATUS = 'PUBLISHED', PUBLISHED_AT = NOW();

CREATE INDEX idx_schedules_status ON SCHEDULES(STATUS);

CREATE TABLE SCHEDULE_VERSIONS (
    ID             UUID        PRIMARY KEY,
    VERSION_NUMBER INT         NOT NULL,
    PUBLISHED_AT   TIMESTAMP   NOT NULL,
    PUBLISHED_BY   VARCHAR(200),
    ENTRY_COUNT    INT         NOT NULL
);

CREATE UNIQUE INDEX idx_schedule_versions_number ON SCHEDULE_VERSIONS(VERSION_NUMBER);

CREATE TABLE SCHEDULE_VERSION_ENTRIES (
    ID          UUID        PRIMARY KEY,
    VERSION_ID  UUID        NOT NULL,
    SCHEDULE_ID UUID        NOT NULL,
    CLASS_ID    UUID        NOT NULL,
    TEACHER_ID  UUID        NOT NULL,
    ROOM_ID     UUID        NOT NULL,
    ROOM_NAME   VARCHAR(100),
    DAY_OF_WEEK VARCHAR(20) NOT NULL,
    START_TIME  TIME        NOT NULL,
    END_TIME    TIME        NOT NULL,
    CONSTRAINT fk_version_entries_version FOREIGN KEY (VERSION_ID)
        REFERENCES SCHEDULE_VERSIONS(ID) ON DELETE CASCADE
);

CREATE INDEX idx_version_entries_version_id ON SCHEDULE_VERSION_ENTRIES(VERSION_ID);
