-- Bootstrap seed for user_db. Runs in every profile that includes db/seed.
-- Backing profile for the single auth-service bootstrap dummy admin (see auth-service seed).
-- ID matches the auth_db bootstrap user. USER_TYPE 'PRINCIPAL' is a base USERS row (no subclass table).
-- All other users (teachers/students/parents/real principals) are created at runtime by an
-- authenticated principal, so nothing else is seeded here.

INSERT INTO USERS (ID, USER_TYPE, LOGIN_ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE_NUMBER) VALUES
    ('00000000-0000-0000-0001-000000000001', 'PRINCIPAL', 'admin', 'Bootstrap', 'Admin', 'admin@artacademy.test', NULL)
ON CONFLICT (ID) DO NOTHING;
