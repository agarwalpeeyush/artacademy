-- Bootstrap seed for auth_db. Runs in every profile that includes db/seed.
-- ROLES are seeded in V1 (required in all profiles).
--
-- This seeds exactly ONE standing ADMIN so the system is loggable on a fresh DB (D8). There is no
-- self-registration endpoint: every other user is provisioned by an authenticated actor
-- (ADMIN → PRINCIPAL → TEACHER → STUDENT/PARENT, per A.6).
--
-- Unlike the earlier "bootstrap dummy admin", this account does NOT self-deactivate once a PRINCIPAL
-- exists — it remains a permanent ADMIN that provisions and elevates principals. IS_BOOTSTRAP is kept
-- only as a provenance marker for the seeded row; it no longer gates login. Forced password-change on
-- first login is deferred.
--
-- Credentials: intended to come from env vars BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD.
-- The values below are the documented LOCAL-DEV DEFAULT only (username 'admin', password 'Admin@1234').

INSERT INTO USERS (ID, USERNAME, PASSWORD, EMAIL, PHONE, STATUS, MUST_CHANGE_PASSWORD, IS_BOOTSTRAP) VALUES
    ('00000000-0000-0000-0001-000000000001', 'admin',
     '$2a$10$tfXCZWMTBa8t03.d/TajOOYcWT9PnaRrb6ufOW4k.tjaoPV2R3qKy',
     'admin@artacademy.test', NULL, 'ACTIVE', FALSE, TRUE)
ON CONFLICT (USERNAME) DO NOTHING;

INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0005-000000000001')
ON CONFLICT (USER_ID, ROLE_ID) DO NOTHING;
