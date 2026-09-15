-- Bootstrap seed for user_db. Runs in every profile that includes db/seed.
-- Backing Person for the single seeded admin (see auth-service seed). ID matches the auth_db admin user.
-- The admin is a standing ADMIN (D8): a PERSONS row with no role-profile; its ADMIN role is granted
-- in auth_db, not derived from a profile here. All other people are created at runtime.

INSERT INTO PERSONS (ID, LOGIN_ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE_NUMBER, STATUS) VALUES
    ('00000000-0000-0000-0001-000000000001', 'admin', 'Bootstrap', 'Admin', 'admin@artacademy.test', NULL, 'ACTIVE')
ON CONFLICT (ID) DO NOTHING;
