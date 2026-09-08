-- V6__seed_sample_users.sql
-- Idempotent sample auth accounts for end-to-end testing.
-- Every account shares the password: Admin@1234
-- (BCrypt hash of "Admin@1234"). UUIDs are FIXED and MUST match the
-- corresponding user-service entities (auth USERS.ID == user-service ID,
-- auth USERNAME == user-service LOGIN_ID) so JWT subjects line up across services.
-- Role links join ROLES by NAME because role IDs are gen_random_uuid().

-- ---- Users -------------------------------------------------------------
INSERT INTO USERS (ID, USERNAME, PASSWORD, EMAIL, STATUS) VALUES
    ('00000000-0000-0000-0001-000000000001', 'principal',  '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'principal@artacademy.test',  'ACTIVE'),
    ('00000000-0000-0000-0002-000000000001', 'teacher1',   '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'teacher1@artacademy.test',   'ACTIVE'),
    ('00000000-0000-0000-0002-000000000002', 'teacher2',   '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'teacher2@artacademy.test',   'ACTIVE'),
    ('00000000-0000-0000-0003-000000000001', 'student1',   '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'student1@artacademy.test',   'ACTIVE'),
    ('00000000-0000-0000-0003-000000000002', 'student2',   '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'student2@artacademy.test',   'ACTIVE'),
    ('00000000-0000-0000-0003-000000000003', 'student3',   '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'student3@artacademy.test',   'ACTIVE'),
    ('00000000-0000-0000-0004-000000000001', 'parent1',    '$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO', 'parent1@artacademy.test',    'ACTIVE')
ON CONFLICT (ID) DO NOTHING;

-- ---- Role assignments (join ROLES by NAME) -----------------------------
INSERT INTO USER_ROLES (USER_ID, ROLE_ID)
SELECT u.ID, r.ID
FROM (VALUES
    ('00000000-0000-0000-0001-000000000001'::uuid, 'PRINCIPAL'),
    ('00000000-0000-0000-0002-000000000001'::uuid, 'TEACHER'),
    ('00000000-0000-0000-0002-000000000002'::uuid, 'TEACHER'),
    ('00000000-0000-0000-0003-000000000001'::uuid, 'STUDENT'),
    ('00000000-0000-0000-0003-000000000002'::uuid, 'STUDENT'),
    ('00000000-0000-0000-0003-000000000003'::uuid, 'STUDENT'),
    ('00000000-0000-0000-0004-000000000001'::uuid, 'PARENT')
) AS u(ID, ROLE_NAME)
JOIN ROLES r ON r.NAME = u.ROLE_NAME
ON CONFLICT (USER_ID, ROLE_ID) DO NOTHING;
