-- V5__seed_sample_users.sql
-- Idempotent sample profiles for end-to-end testing.
-- IDs are FIXED and MUST match auth-service USERS.ID (same UUID); LOGIN_ID == auth USERNAME.
-- USER_TYPE is the JOINED-inheritance discriminator (STUDENT / TEACHER / PARENT).

-- ---- Base USERS rows ---------------------------------------------------
INSERT INTO USERS (ID, USER_TYPE, LOGIN_ID, FIRST_NAME, LAST_NAME) VALUES
    ('00000000-0000-0000-0002-000000000001', 'TEACHER', 'teacher1', 'Aisha',  'Khan'),
    ('00000000-0000-0000-0002-000000000002', 'TEACHER', 'teacher2', 'Rahul',  'Verma'),
    ('00000000-0000-0000-0003-000000000001', 'STUDENT', 'student1', 'Meera',  'Nair'),
    ('00000000-0000-0000-0003-000000000002', 'STUDENT', 'student2', 'Arjun',  'Sharma'),
    ('00000000-0000-0000-0003-000000000003', 'STUDENT', 'student3', 'Diya',   'Patel'),
    ('00000000-0000-0000-0004-000000000001', 'PARENT',  'parent1',  'Sunita', 'Nair')
ON CONFLICT (ID) DO NOTHING;

-- ---- Teachers ----------------------------------------------------------
INSERT INTO TEACHERS (ID, EMPLOYEE_CODE, EMAIL, PHONE, QUALIFICATION, JOINING_DATE, STATUS) VALUES
    ('00000000-0000-0000-0002-000000000001', 'EMP-001', 'teacher1@artacademy.test', '+91-90000-00001', 'M.F.A. Painting',   DATE '2023-06-01', 'ACTIVE'),
    ('00000000-0000-0000-0002-000000000002', 'EMP-002', 'teacher2@artacademy.test', '+91-90000-00002', 'B.F.A. Sculpture',  DATE '2024-01-15', 'ACTIVE')
ON CONFLICT (ID) DO NOTHING;

-- ---- Students ----------------------------------------------------------
INSERT INTO STUDENTS (ID, DATE_OF_BIRTH, FATHER_NAME, FATHER_PHONE, MOTHER_NAME, MOTHER_PHONE, GUARDIAN_NAME, GUARDIAN_PHONE, EMAIL, ADDRESS, ENROLLMENT_DATE, STATUS) VALUES
    ('00000000-0000-0000-0003-000000000001', DATE '2010-04-12', 'Ravi Nair',    '+91-98000-00001', 'Sunita Nair',   '+91-98000-00002', 'Sunita Nair',  '+91-98000-00002', 'student1@artacademy.test', '12 Palette Street, Pune',  DATE '2025-06-01', 'ACTIVE'),
    ('00000000-0000-0000-0003-000000000002', DATE '2011-09-30', 'Vijay Sharma', '+91-98000-00003', 'Anita Sharma',  '+91-98000-00004', NULL,            NULL,              'student2@artacademy.test', '7 Canvas Road, Mumbai',    DATE '2025-06-01', 'ACTIVE'),
    ('00000000-0000-0000-0003-000000000003', DATE '2012-01-20', 'Nikhil Patel', '+91-98000-00005', 'Reena Patel',   '+91-98000-00006', NULL,            NULL,              'student3@artacademy.test', '3 Easel Lane, Nashik',     DATE '2025-07-01', 'ACTIVE')
ON CONFLICT (ID) DO NOTHING;

-- ---- Parents (parent1 linked to student1) ------------------------------
INSERT INTO PARENTS (ID, RELATIONSHIP, PHONE, EMAIL, ADDRESS, OCCUPATION, STUDENT_ID, STATUS) VALUES
    ('00000000-0000-0000-0004-000000000001', 'MOTHER', '+91-98000-00002', 'parent1@artacademy.test', '12 Palette Street, Pune', 'Architect', '00000000-0000-0000-0003-000000000001', 'ACTIVE')
ON CONFLICT (ID) DO NOTHING;

-- ---- Teacher weekly availability --------------------------------------
INSERT INTO TEACHER_AVAILABILITY (ID, TEACHER_ID, DAY_OF_WEEK, START_TIME, END_TIME) VALUES
    ('00000000-0000-0000-02a1-000000000001', '00000000-0000-0000-0002-000000000001', 'MONDAY',    TIME '09:00', TIME '17:00'),
    ('00000000-0000-0000-02a1-000000000002', '00000000-0000-0000-0002-000000000001', 'WEDNESDAY', TIME '09:00', TIME '17:00'),
    ('00000000-0000-0000-02a2-000000000001', '00000000-0000-0000-0002-000000000002', 'TUESDAY',   TIME '10:00', TIME '18:00'),
    ('00000000-0000-0000-02a2-000000000002', '00000000-0000-0000-0002-000000000002', 'THURSDAY',  TIME '10:00', TIME '18:00')
ON CONFLICT (ID) DO NOTHING;
