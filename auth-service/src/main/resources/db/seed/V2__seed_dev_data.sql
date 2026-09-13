-- Bootstrap seed for auth_db. Runs in every profile that includes db/seed.
-- ROLES are seeded in V1 (required in all profiles).
--
-- This seeds exactly ONE bootstrap "dummy admin" PRINCIPAL so the system is loggable on a fresh DB.
-- There is no self-registration endpoint: every other user is created by an authenticated PRINCIPAL.
-- The dummy admin exists SOLELY to create the first real principal, then self-deactivates:
--   * It logs in with the documented dev-default credential and is NEVER prompted to change it.
--     MUST_CHANGE_PASSWORD stays FALSE and the admin password cannot be changed (auth-service rejects
--     /auth/change-password for a bootstrap account). Nothing else may be done with this account —
--     it is scoped to creating a single PRINCIPAL (backend + UI enforced).
--   * IS_BOOTSTRAP marks it; once a real (non-bootstrap) PRINCIPAL exists it is set STATUS='INACTIVE'
--     (by auth-service on login and on the PRINCIPAL-created Kafka event) and can no longer log in.
--   * Re-activation is DB-migration-only (break-glass): flip STATUS back to 'ACTIVE' via a migration.
--
-- Credentials: intended to come from env vars BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD.
-- The values below are the documented LOCAL-DEV DEFAULT only (username 'admin', password 'Admin@1234').

INSERT INTO USERS (ID, USERNAME, PASSWORD, EMAIL, PHONE, STATUS, MUST_CHANGE_PASSWORD, IS_BOOTSTRAP) VALUES
    ('00000000-0000-0000-0001-000000000001', 'admin',
     '$2a$10$tfXCZWMTBa8t03.d/TajOOYcWT9PnaRrb6ufOW4k.tjaoPV2R3qKy',
     'admin@artacademy.test', NULL, 'ACTIVE', FALSE, TRUE)
ON CONFLICT (USERNAME) DO NOTHING;

INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0005-000000000002')
ON CONFLICT (USER_ID, ROLE_ID) DO NOTHING;
