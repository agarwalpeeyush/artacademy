-- =============================================================
-- Art Academy Sample Data Seed
-- Run as: psql -U artacademy -h localhost -p 15432
-- =============================================================

-- =============================================================
-- AUTH DB: Users (principal, 3 teachers, 5 students)
-- Password for all: Admin@123
-- =============================================================
\c auth_db

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Principal
INSERT INTO users (id, username, password, email, status) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'principal', crypt('Admin@123', gen_salt('bf',10)), 'principal@artacademy.com', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- Teachers
INSERT INTO users (id, username, password, email, status) VALUES
  ('aaaaaaaa-0002-0002-0002-000000000002', 'teacher.riya', crypt('Admin@123', gen_salt('bf',10)), 'riya.sharma@artacademy.com', 'ACTIVE'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'teacher.arjun', crypt('Admin@123', gen_salt('bf',10)), 'arjun.mehta@artacademy.com', 'ACTIVE'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'teacher.priya', crypt('Admin@123', gen_salt('bf',10)), 'priya.nair@artacademy.com', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- Students
INSERT INTO users (id, username, password, email, status) VALUES
  ('aaaaaaaa-0005-0005-0005-000000000005', 'student.aditya', crypt('Admin@123', gen_salt('bf',10)), 'aditya.kumar@gmail.com', 'ACTIVE'),
  ('aaaaaaaa-0006-0006-0006-000000000006', 'student.sneha', crypt('Admin@123', gen_salt('bf',10)), 'sneha.patel@gmail.com', 'ACTIVE'),
  ('aaaaaaaa-0007-0007-0007-000000000007', 'student.rahul', crypt('Admin@123', gen_salt('bf',10)), 'rahul.singh@gmail.com', 'ACTIVE'),
  ('aaaaaaaa-0008-0008-0008-000000000008', 'student.kavya', crypt('Admin@123', gen_salt('bf',10)), 'kavya.reddy@gmail.com', 'ACTIVE'),
  ('aaaaaaaa-0009-0009-0009-000000000009', 'student.ananya', crypt('Admin@123', gen_salt('bf',10)), 'ananya.joshi@gmail.com', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'principal' AND r.name = 'PRINCIPAL'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username IN ('teacher.riya','teacher.arjun','teacher.priya') AND r.name = 'TEACHER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username IN ('student.aditya','student.sneha','student.rahul','student.kavya','student.ananya') AND r.name = 'STUDENT'
ON CONFLICT DO NOTHING;


-- =============================================================
-- USER DB: Teachers (linked to auth users)
-- =============================================================
\c user_db

INSERT INTO users (id, user_type, login_id, first_name, last_name) VALUES
  ('aaaaaaaa-0002-0002-0002-000000000002', 'TEACHER', 'teacher.riya', 'Riya', 'Sharma'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'TEACHER', 'teacher.arjun', 'Arjun', 'Mehta'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'TEACHER', 'teacher.priya', 'Priya', 'Nair')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (id, employee_code, email, phone, qualification, joining_date, status) VALUES
  ('aaaaaaaa-0002-0002-0002-000000000002', 'EMP001', 'riya.sharma@artacademy.com', '9876543210', 'B.F.A. (Classical Dance)', '2020-06-01', 'ACTIVE'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'EMP002', 'arjun.mehta@artacademy.com', '9876543211', 'M.A. (Music)', '2019-03-15', 'ACTIVE'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'EMP003', 'priya.nair@artacademy.com', '9876543212', 'Diploma in Visual Arts', '2021-09-01', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- USER DB: Students (linked to auth users)
-- =============================================================

INSERT INTO users (id, user_type, login_id, first_name, last_name) VALUES
  ('aaaaaaaa-0005-0005-0005-000000000005', 'STUDENT', 'student.aditya', 'Aditya', 'Kumar'),
  ('aaaaaaaa-0006-0006-0006-000000000006', 'STUDENT', 'student.sneha', 'Sneha', 'Patel'),
  ('aaaaaaaa-0007-0007-0007-000000000007', 'STUDENT', 'student.rahul', 'Rahul', 'Singh'),
  ('aaaaaaaa-0008-0008-0008-000000000008', 'STUDENT', 'student.kavya', 'Kavya', 'Reddy'),
  ('aaaaaaaa-0009-0009-0009-000000000009', 'STUDENT', 'student.ananya', 'Ananya', 'Joshi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, email, date_of_birth, father_name, father_phone, mother_name, mother_phone, address, enrollment_date, status) VALUES
  ('aaaaaaaa-0005-0005-0005-000000000005', 'aditya.kumar@gmail.com', '2008-04-12', 'Ramesh Kumar', '9900001111', 'Sunita Kumar', '9900002222', '14 MG Road, Bangalore', '2023-06-01', 'ACTIVE'),
  ('aaaaaaaa-0006-0006-0006-000000000006', 'sneha.patel@gmail.com', '2009-11-05', 'Suresh Patel', '9900003333', 'Meena Patel', '9900004444', '7 Park Street, Ahmedabad', '2023-06-01', 'ACTIVE'),
  ('aaaaaaaa-0007-0007-0007-000000000007', 'rahul.singh@gmail.com', '2007-08-20', 'Vikram Singh', '9900005555', 'Priti Singh', '9900006666', '22 Lajpat Nagar, Delhi', '2023-07-01', 'ACTIVE'),
  ('aaaaaaaa-0008-0008-0008-000000000008', 'kavya.reddy@gmail.com', '2010-02-14', 'Krishna Reddy', '9900007777', 'Lalitha Reddy', '9900008888', '5 Jubilee Hills, Hyderabad', '2024-01-15', 'ACTIVE'),
  ('aaaaaaaa-0009-0009-0009-000000000009', 'ananya.joshi@gmail.com', '2009-07-30', 'Nitin Joshi', '9900009999', 'Rekha Joshi', '9900010000', '9 FC Road, Pune', '2024-01-15', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- ACADEMIC DB: Courses
-- =============================================================
\c academic_db

INSERT INTO courses (id, course_code, course_name, course_type, description, monthly_fee, admission_fee, duration_months, status) VALUES
  ('cccccccc-0001-0001-0001-000000000001', 'DANCE-CLS', 'Classical Dance', 'DANCE', 'Bharatanatyam and Kathak fundamentals', 2500.00, 5000.00, 12, 'ACTIVE'),
  ('cccccccc-0002-0002-0002-000000000002', 'MUSIC-VOC', 'Vocal Music', 'MUSIC', 'Hindustani classical and light music', 2000.00, 3000.00, 12, 'ACTIVE'),
  ('cccccccc-0003-0003-0003-000000000003', 'PAINT-WAT', 'Watercolor Painting', 'VISUAL_ART', 'Beginner to intermediate watercolor techniques', 1800.00, 2000.00, 6, 'ACTIVE'),
  ('cccccccc-0004-0004-0004-000000000004', 'DANCE-BOL', 'Bollywood Dance', 'DANCE', 'Contemporary Bollywood and fusion styles', 2000.00, 3000.00, 6, 'ACTIVE')
ON CONFLICT (course_code) DO NOTHING;


-- =============================================================
-- ACADEMIC DB: Classes
-- =============================================================

INSERT INTO classes (id, course_id, teacher_id, class_name, room_number, capacity, status) VALUES
  ('dddddddd-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'Classical Dance - Batch A', 'Studio 1', 20, 'ACTIVE'),
  ('dddddddd-0002-0002-0002-000000000002', 'cccccccc-0002-0002-0002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'Vocal Music - Batch A', 'Room 201', 15, 'ACTIVE'),
  ('dddddddd-0003-0003-0003-000000000003', 'cccccccc-0003-0003-0003-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'Watercolor Painting - Batch A', 'Art Room', 12, 'ACTIVE'),
  ('dddddddd-0004-0004-0004-000000000004', 'cccccccc-0004-0004-0004-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'Bollywood Dance - Batch A', 'Studio 2', 20, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- ACADEMIC DB: Enrollments
-- =============================================================

INSERT INTO enrollments (id, student_id, course_id, class_id, enrollment_date, status) VALUES
  -- Aditya: Classical Dance + Vocal Music
  ('eeeeeeee-0001-0001-0001-000000000001', 'aaaaaaaa-0005-0005-0005-000000000005', 'cccccccc-0001-0001-0001-000000000001', 'dddddddd-0001-0001-0001-000000000001', '2023-06-01', 'ACTIVE'),
  ('eeeeeeee-0002-0002-0002-000000000002', 'aaaaaaaa-0005-0005-0005-000000000005', 'cccccccc-0002-0002-0002-000000000002', 'dddddddd-0002-0002-0002-000000000002', '2023-06-01', 'ACTIVE'),
  -- Sneha: Classical Dance + Watercolor Painting
  ('eeeeeeee-0003-0003-0003-000000000003', 'aaaaaaaa-0006-0006-0006-000000000006', 'cccccccc-0001-0001-0001-000000000001', 'dddddddd-0001-0001-0001-000000000001', '2023-06-01', 'ACTIVE'),
  ('eeeeeeee-0004-0004-0004-000000000004', 'aaaaaaaa-0006-0006-0006-000000000006', 'cccccccc-0003-0003-0003-000000000003', 'dddddddd-0003-0003-0003-000000000003', '2023-06-01', 'ACTIVE'),
  -- Rahul: Vocal Music
  ('eeeeeeee-0005-0005-0005-000000000005', 'aaaaaaaa-0007-0007-0007-000000000007', 'cccccccc-0002-0002-0002-000000000002', 'dddddddd-0002-0002-0002-000000000002', '2023-07-01', 'ACTIVE'),
  -- Kavya: Bollywood Dance + Watercolor Painting
  ('eeeeeeee-0006-0006-0006-000000000006', 'aaaaaaaa-0008-0008-0008-000000000008', 'cccccccc-0004-0004-0004-000000000004', 'dddddddd-0004-0004-0004-000000000004', '2024-01-15', 'ACTIVE'),
  ('eeeeeeee-0007-0007-0007-000000000007', 'aaaaaaaa-0008-0008-0008-000000000008', 'cccccccc-0003-0003-0003-000000000003', 'dddddddd-0003-0003-0003-000000000003', '2024-01-15', 'ACTIVE'),
  -- Ananya: Classical Dance + Bollywood Dance
  ('eeeeeeee-0008-0008-0008-000000000008', 'aaaaaaaa-0009-0009-0009-000000000009', 'cccccccc-0001-0001-0001-000000000001', 'dddddddd-0001-0001-0001-000000000001', '2024-01-15', 'ACTIVE'),
  ('eeeeeeee-0009-0009-0009-000000000009', 'aaaaaaaa-0009-0009-0009-000000000009', 'cccccccc-0004-0004-0004-000000000004', 'dddddddd-0004-0004-0004-000000000004', '2024-01-15', 'ACTIVE')
ON CONFLICT (student_id, course_id) DO NOTHING;


-- =============================================================
-- SCHEDULE DB: Rooms + Schedules
-- =============================================================
\c timetable_db

INSERT INTO rooms (id, room_name, capacity) VALUES
  ('ffffffff-0001-0001-0001-000000000001', 'Studio 1', 20),
  ('ffffffff-0002-0002-0002-000000000002', 'Studio 2', 20),
  ('ffffffff-0003-0003-0003-000000000003', 'Room 201', 15),
  ('ffffffff-0004-0004-0004-000000000004', 'Art Room', 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO timetables (id, class_id, teacher_id, room_id, start_time, end_time, day_of_week) VALUES
  -- Classical Dance: Mon/Wed/Fri 09:00–10:30
  ('gggggggg-0001-0001-0001-000000000001', 'dddddddd-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0001-0001-0001-000000000001', '09:00', '10:30', 'MONDAY'),
  ('gggggggg-0002-0002-0002-000000000002', 'dddddddd-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0001-0001-0001-000000000001', '09:00', '10:30', 'WEDNESDAY'),
  ('gggggggg-0003-0003-0003-000000000003', 'dddddddd-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0001-0001-0001-000000000001', '09:00', '10:30', 'FRIDAY'),
  -- Vocal Music: Tue/Thu 11:00–12:30
  ('gggggggg-0004-0004-0004-000000000004', 'dddddddd-0002-0002-0002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'ffffffff-0003-0003-0003-000000000003', '11:00', '12:30', 'TUESDAY'),
  ('gggggggg-0005-0005-0005-000000000005', 'dddddddd-0002-0002-0002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'ffffffff-0003-0003-0003-000000000003', '11:00', '12:30', 'THURSDAY'),
  -- Watercolor Painting: Sat 10:00–12:00
  ('gggggggg-0006-0006-0006-000000000006', 'dddddddd-0003-0003-0003-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'ffffffff-0004-0004-0004-000000000004', '10:00', '12:00', 'SATURDAY'),
  -- Bollywood Dance: Mon/Thu 14:00–15:30
  ('gggggggg-0007-0007-0007-000000000007', 'dddddddd-0004-0004-0004-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0002-0002-0002-000000000002', '14:00', '15:30', 'MONDAY'),
  ('gggggggg-0008-0008-0008-000000000008', 'dddddddd-0004-0004-0004-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0002-0002-0002-000000000002', '14:00', '15:30', 'THURSDAY')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- ATTENDANCE DB: Student attendance (last 2 weeks)
-- =============================================================
\c attendance_db

-- Aditya in Classical Dance class (Mon/Wed/Fri last 2 weeks)
INSERT INTO student_attendance (id, student_id, class_id, attendance_date, status, remarks) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 14, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 12, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 10, 'ABSENT', 'Sick leave'),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 7, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 5, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 3, 'PRESENT', NULL)
ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;

-- Aditya in Vocal Music class (Tue/Thu last 2 weeks)
INSERT INTO student_attendance (id, student_id, class_id, attendance_date, status, remarks) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 13, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 11, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 6, 'LATE', 'Arrived 10 min late'),
  (gen_random_uuid(), 'aaaaaaaa-0005-0005-0005-000000000005', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 4, 'PRESENT', NULL)
ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;

-- Sneha in Classical Dance
INSERT INTO student_attendance (id, student_id, class_id, attendance_date, status, remarks) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0006-0006-0006-000000000006', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 14, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0006-0006-0006-000000000006', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 12, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0006-0006-0006-000000000006', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 10, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0006-0006-0006-000000000006', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 7, 'ABSENT', 'Family function'),
  (gen_random_uuid(), 'aaaaaaaa-0006-0006-0006-000000000006', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 5, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0006-0006-0006-000000000006', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 3, 'PRESENT', NULL)
ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;

-- Rahul in Vocal Music
INSERT INTO student_attendance (id, student_id, class_id, attendance_date, status, remarks) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0007-0007-0007-000000000007', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 13, 'ABSENT', 'No information'),
  (gen_random_uuid(), 'aaaaaaaa-0007-0007-0007-000000000007', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 11, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0007-0007-0007-000000000007', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 6, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0007-0007-0007-000000000007', 'dddddddd-0002-0002-0002-000000000002', CURRENT_DATE - 4, 'PRESENT', NULL)
ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;

-- Kavya in Bollywood Dance
INSERT INTO student_attendance (id, student_id, class_id, attendance_date, status, remarks) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0008-0008-0008-000000000008', 'dddddddd-0004-0004-0004-000000000004', CURRENT_DATE - 14, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0008-0008-0008-000000000008', 'dddddddd-0004-0004-0004-000000000004', CURRENT_DATE - 11, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0008-0008-0008-000000000008', 'dddddddd-0004-0004-0004-000000000004', CURRENT_DATE - 7, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0008-0008-0008-000000000008', 'dddddddd-0004-0004-0004-000000000004', CURRENT_DATE - 4, 'LATE', NULL)
ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;

-- Ananya in Classical Dance
INSERT INTO student_attendance (id, student_id, class_id, attendance_date, status, remarks) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0009-0009-0009-000000000009', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 14, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0009-0009-0009-000000000009', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 12, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0009-0009-0009-000000000009', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 10, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0009-0009-0009-000000000009', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 7, 'PRESENT', NULL),
  (gen_random_uuid(), 'aaaaaaaa-0009-0009-0009-000000000009', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 5, 'ABSENT', 'Medical'),
  (gen_random_uuid(), 'aaaaaaaa-0009-0009-0009-000000000009', 'dddddddd-0001-0001-0001-000000000001', CURRENT_DATE - 3, 'PRESENT', NULL)
ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;


-- =============================================================
-- PAYMENT DB: Fee cycles + payments (Aug & Sep 2026)
-- =============================================================
\c payment_db

-- Aditya Kumar: Classical Dance (2500) + Vocal Music (2000) = 5500/month
-- August 2026 - PAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0001-0001-0001-000000000001', 'aaaaaaaa-0005-0005-0005-000000000005', 8, 2026, 4500.00, 4500.00, 0.00, 'PAID', '2026-08-01', '2026-08-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- September 2026 - UNPAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0002-0002-0002-000000000002', 'aaaaaaaa-0005-0005-0005-000000000005', 9, 2026, 4500.00, 0.00, 4500.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Sneha Patel: Classical Dance (2500) + Watercolor (1800) = 4300/month
-- August 2026 - PAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0003-0003-0003-000000000003', 'aaaaaaaa-0006-0006-0006-000000000006', 8, 2026, 4300.00, 4300.00, 0.00, 'PAID', '2026-08-01', '2026-08-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- September 2026 - PARTIAL
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0004-0004-0004-000000000004', 'aaaaaaaa-0006-0006-0006-000000000006', 9, 2026, 4300.00, 2500.00, 1800.00, 'PARTIAL', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Rahul Singh: Vocal Music (2000)/month
-- August 2026 - PAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0005-0005-0005-000000000005', 'aaaaaaaa-0007-0007-0007-000000000007', 8, 2026, 2000.00, 2000.00, 0.00, 'PAID', '2026-08-01', '2026-08-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- September 2026 - UNPAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0006-0006-0006-000000000006', 'aaaaaaaa-0007-0007-0007-000000000007', 9, 2026, 2000.00, 0.00, 2000.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Kavya Reddy: Bollywood Dance (2000) + Watercolor (1800) = 3800/month
-- August 2026 - PAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0007-0007-0007-000000000007', 'aaaaaaaa-0008-0008-0008-000000000008', 8, 2026, 3800.00, 3800.00, 0.00, 'PAID', '2026-08-01', '2026-08-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- September 2026 - UNPAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0008-0008-0008-000000000008', 'aaaaaaaa-0008-0008-0008-000000000008', 9, 2026, 3800.00, 0.00, 3800.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Ananya Joshi: Classical Dance (2500) + Bollywood Dance (2000) = 4500/month
-- August 2026 - PAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0009-0009-0009-000000000009', 'aaaaaaaa-0009-0009-0009-000000000009', 8, 2026, 4500.00, 4500.00, 0.00, 'PAID', '2026-08-01', '2026-08-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- September 2026 - UNPAID
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('hhhhhhhh-0010-0010-0010-000000000010', 'aaaaaaaa-0009-0009-0009-000000000009', 9, 2026, 4500.00, 0.00, 4500.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;


-- =============================================================
-- PAYMENT DB: Actual payment records (August paid cycles)
-- =============================================================

INSERT INTO payments (id, fee_cycle_id, student_id, amount, payment_mode, transaction_reference, payment_date, remarks) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0001-0001-0001-000000000001', 'aaaaaaaa-0005-0005-0005-000000000005', 4500.00, 'UPI', 'UPI2608001ADITYA', '2026-08-05 10:30:00', 'August fees paid in full'),
  (gen_random_uuid(), 'hhhhhhhh-0003-0003-0003-000000000003', 'aaaaaaaa-0006-0006-0006-000000000006', 4300.00, 'CASH', NULL, '2026-08-04 11:00:00', 'August fees paid in full'),
  (gen_random_uuid(), 'hhhhhhhh-0005-0005-0005-000000000005', 'aaaaaaaa-0007-0007-0007-000000000007', 2000.00, 'ONLINE', 'NEFT2608007RAHUL', '2026-08-07 09:15:00', 'August fees'),
  (gen_random_uuid(), 'hhhhhhhh-0007-0007-0007-000000000007', 'aaaaaaaa-0008-0008-0008-000000000008', 3800.00, 'UPI', 'UPI2608008KAVYA', '2026-08-03 16:45:00', 'August fees'),
  (gen_random_uuid(), 'hhhhhhhh-0009-0009-0009-000000000009', 'aaaaaaaa-0009-0009-0009-000000000009', 4500.00, 'CHEQUE', 'CHQ-20260802-001', '2026-08-02 12:00:00', 'August fees - cheque'),
  -- Sneha partial payment for September
  (gen_random_uuid(), 'hhhhhhhh-0004-0004-0004-000000000004', 'aaaaaaaa-0006-0006-0006-000000000006', 2500.00, 'CASH', NULL, '2026-09-03 11:00:00', 'Partial payment - dance fees only')
ON CONFLICT DO NOTHING;


-- =============================================================
-- PAYMENT DB: Fee details for September cycles
-- =============================================================

-- Aditya Sep: Classical Dance + Vocal Music
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0002-0002-0002-000000000002', 'eeeeeeee-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001', 2500.00, 0.00, 2500.00, 'UNPAID'),
  (gen_random_uuid(), 'hhhhhhhh-0002-0002-0002-000000000002', 'eeeeeeee-0002-0002-0002-000000000002', 'cccccccc-0002-0002-0002-000000000002', 2000.00, 0.00, 2000.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Sneha Sep: Classical Dance (partial) + Watercolor (unpaid)
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0004-0004-0004-000000000004', 'eeeeeeee-0003-0003-0003-000000000003', 'cccccccc-0001-0001-0001-000000000001', 2500.00, 2500.00, 0.00, 'PAID'),
  (gen_random_uuid(), 'hhhhhhhh-0004-0004-0004-000000000004', 'eeeeeeee-0004-0004-0004-000000000004', 'cccccccc-0003-0003-0003-000000000003', 1800.00, 0.00, 1800.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Rahul Sep: Vocal Music
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0006-0006-0006-000000000006', 'eeeeeeee-0005-0005-0005-000000000005', 'cccccccc-0002-0002-0002-000000000002', 2000.00, 0.00, 2000.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Kavya Sep: Bollywood Dance + Watercolor
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0008-0008-0008-000000000008', 'eeeeeeee-0006-0006-0006-000000000006', 'cccccccc-0004-0004-0004-000000000004', 2000.00, 0.00, 2000.00, 'UNPAID'),
  (gen_random_uuid(), 'hhhhhhhh-0008-0008-0008-000000000008', 'eeeeeeee-0007-0007-0007-000000000007', 'cccccccc-0003-0003-0003-000000000003', 1800.00, 0.00, 1800.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Ananya Sep: Classical Dance + Bollywood Dance
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'hhhhhhhh-0010-0010-0010-000000000010', 'eeeeeeee-0008-0008-0008-000000000008', 'cccccccc-0001-0001-0001-000000000001', 2500.00, 0.00, 2500.00, 'UNPAID'),
  (gen_random_uuid(), 'hhhhhhhh-0010-0010-0010-000000000010', 'eeeeeeee-0009-0009-0009-000000000009', 'cccccccc-0004-0004-0004-000000000004', 2000.00, 0.00, 2000.00, 'UNPAID')
ON CONFLICT DO NOTHING;

\echo ''
\echo '=== Seed data inserted successfully ==='
\echo ''
\echo 'Login credentials (all use password: Admin@123)'
\echo '  Principal : principal'
\echo '  Teachers  : teacher.riya, teacher.arjun, teacher.priya'
\echo '  Students  : student.aditya, student.sneha, student.rahul, student.kavya, student.ananya'
\echo ''
