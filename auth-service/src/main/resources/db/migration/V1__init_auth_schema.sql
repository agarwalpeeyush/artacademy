-- Auth service schema (auth_db). Matches JPA entities under ddl-auto=validate.
-- EMAIL is nullable and non-unique: auto-created parent logins have no email (their identity
-- is the phone number, used as USERNAME). PHONE is carried for downstream consumers
-- (e.g. notification-service). Uniqueness of EMAIL is a service-layer concern.

CREATE TABLE ROLES (
    ID   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    NAME VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE USERS (
    ID                   UUID PRIMARY KEY,
    USERNAME             VARCHAR(100) NOT NULL UNIQUE,
    PASSWORD             VARCHAR(255) NOT NULL,
    EMAIL                VARCHAR(200),
    PHONE                VARCHAR(30),
    STATUS               VARCHAR(20)  DEFAULT 'ACTIVE',
    -- Forces a password reset on first login (used by the bootstrap dummy admin).
    MUST_CHANGE_PASSWORD BOOLEAN NOT NULL DEFAULT FALSE,
    -- Marks the seeded bootstrap dummy admin. It self-deactivates once a real PRINCIPAL exists
    -- and can only be re-activated via a DB migration script (break-glass recovery).
    IS_BOOTSTRAP         BOOLEAN NOT NULL DEFAULT FALSE,
    CREATED_AT           TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UPDATED_AT           TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE USER_ROLES (
    USER_ID UUID NOT NULL,
    ROLE_ID UUID NOT NULL,
    PRIMARY KEY (USER_ID, ROLE_ID),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (ROLE_ID) REFERENCES ROLES (ID) ON DELETE CASCADE
);

CREATE TABLE REFRESH_TOKENS (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_ID     UUID NOT NULL,
    TOKEN       VARCHAR(500) NOT NULL UNIQUE,
    EXPIRY_DATE TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE TABLE PASSWORD_RESET_TOKENS (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_ID     UUID NOT NULL,
    TOKEN       VARCHAR(200) NOT NULL UNIQUE,
    EXPIRY_DATE TIMESTAMP WITH TIME ZONE NOT NULL,
    USED        BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_prt_token ON PASSWORD_RESET_TOKENS (TOKEN);

CREATE TABLE AUDIT_LOGS (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USERNAME    VARCHAR(100) NOT NULL,
    ACTION      VARCHAR(100) NOT NULL,
    DETAIL      TEXT,
    IP_ADDRESS  VARCHAR(50),
    SUCCESS     BOOLEAN NOT NULL,
    OCCURRED_AT TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_audit_username ON AUDIT_LOGS (USERNAME);
CREATE INDEX idx_audit_occurred_at ON AUDIT_LOGS (OCCURRED_AT DESC);

-- Tombstones for usernames retired by a promotion (D3/D9). When a parent is promoted to staff their
-- phone-username is renamed to the staff loginId; the old phone-username is inserted here so it can
-- never be reassigned to another Person (phone is non-unique per D2). Reserve-only for v1: the old
-- name simply stops authenticating and is blocked at create time — aliasing is deferred.
CREATE TABLE RESERVED_USERNAMES (
    USERNAME    VARCHAR(100) PRIMARY KEY,
    PERSON_ID   UUID,
    RESERVED_AT TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Roles are required by the Kafka consumer (resolveRoles) in EVERY profile, so they are
-- seeded here in the base migration rather than in the dev-only data seed.
INSERT INTO ROLES (ID, NAME) VALUES
    ('00000000-0000-0000-0005-000000000001', 'ADMIN'),
    ('00000000-0000-0000-0005-000000000002', 'PRINCIPAL'),
    ('00000000-0000-0000-0005-000000000003', 'TEACHER'),
    ('00000000-0000-0000-0005-000000000004', 'STUDENT'),
    ('00000000-0000-0000-0005-000000000005', 'PARENT')
ON CONFLICT (NAME) DO NOTHING;
