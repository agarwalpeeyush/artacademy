-- V1__init_schedule_schema.sql
-- Flyway migration: create rooms and schedules tables

CREATE TABLE IF NOT EXISTS rooms (
    id        BIGSERIAL     PRIMARY KEY,
    room_name VARCHAR(100)  NOT NULL,
    capacity  INT           NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
    id          BIGSERIAL    PRIMARY KEY,
    class_id    BIGINT       NOT NULL,
    teacher_id  BIGINT       NOT NULL,
    room_id     BIGINT       NOT NULL,
    start_time  TIME         NOT NULL,
    end_time    TIME         NOT NULL,
    day_of_week VARCHAR(20)  NOT NULL,
    CONSTRAINT fk_schedules_room FOREIGN KEY (room_id)
        REFERENCES rooms (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id  ON schedules (teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id    ON schedules (class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_room_id     ON schedules (room_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules (day_of_week);
