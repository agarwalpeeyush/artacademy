-- V1__init_notification_schema.sql
-- Notification Service schema: stores all outbound notifications

CREATE TABLE IF NOT EXISTS notifications (
    id                BIGSERIAL       NOT NULL,
    user_id           BIGINT,
    recipient_email   VARCHAR(200),
    recipient_phone   VARCHAR(20),
    subject           VARCHAR(500),
    body              TEXT,
    channel           VARCHAR(20)     NOT NULL DEFAULT 'EMAIL',
    status            VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    sent_at           TIMESTAMP,
    created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    error_message     TEXT,
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT chk_notifications_channel
        CHECK (channel IN ('EMAIL', 'SMS', 'BOTH')),
    CONSTRAINT chk_notifications_status
        CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
    ON notifications (status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
    ON notifications (user_id, created_at DESC);
