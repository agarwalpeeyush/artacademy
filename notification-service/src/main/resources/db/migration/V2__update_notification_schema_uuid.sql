-- V2__update_notification_schema_uuid.sql
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE NOTIFICATIONS (
    ID               UUID          PRIMARY KEY,
    USER_ID          UUID,
    RECIPIENT_EMAIL  VARCHAR(200),
    RECIPIENT_PHONE  VARCHAR(20),
    SUBJECT          VARCHAR(500),
    BODY             TEXT,
    CHANNEL          VARCHAR(20)   NOT NULL DEFAULT 'EMAIL',
    STATUS           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    SENT_AT          TIMESTAMP,
    CREATED_AT       TIMESTAMP     NOT NULL DEFAULT NOW(),
    ERROR_MESSAGE    TEXT,
    CONSTRAINT chk_notifications_channel CHECK (CHANNEL IN ('EMAIL', 'SMS', 'BOTH')),
    CONSTRAINT chk_notifications_status  CHECK (STATUS IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX idx_notifications_user_id            ON NOTIFICATIONS(USER_ID);
CREATE INDEX idx_notifications_status             ON NOTIFICATIONS(STATUS);
CREATE INDEX idx_notifications_user_id_created_at ON NOTIFICATIONS(USER_ID, CREATED_AT DESC);
