-- Fix schedules and payment data with valid UUIDs

-- =============================================================
-- SCHEDULE DB: Schedules (valid hex UUIDs)
-- =============================================================
\c timetable_db

INSERT INTO timetables (id, class_id, teacher_id, room_id, start_time, end_time, day_of_week) VALUES
  ('a1a1a1a1-0001-0001-0001-000000000001', 'dddddddd-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0001-0001-0001-000000000001', '09:00', '10:30', 'MONDAY'),
  ('a1a1a1a1-0002-0002-0002-000000000002', 'dddddddd-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0001-0001-0001-000000000001', '09:00', '10:30', 'WEDNESDAY'),
  ('a1a1a1a1-0003-0003-0003-000000000003', 'dddddddd-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0001-0001-0001-000000000001', '09:00', '10:30', 'FRIDAY'),
  ('a1a1a1a1-0004-0004-0004-000000000004', 'dddddddd-0002-0002-0002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'ffffffff-0003-0003-0003-000000000003', '11:00', '12:30', 'TUESDAY'),
  ('a1a1a1a1-0005-0005-0005-000000000005', 'dddddddd-0002-0002-0002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'ffffffff-0003-0003-0003-000000000003', '11:00', '12:30', 'THURSDAY'),
  ('a1a1a1a1-0006-0006-0006-000000000006', 'dddddddd-0003-0003-0003-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'ffffffff-0004-0004-0004-000000000004', '10:00', '12:00', 'SATURDAY'),
  ('a1a1a1a1-0007-0007-0007-000000000007', 'dddddddd-0004-0004-0004-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0002-0002-0002-000000000002', '14:00', '15:30', 'MONDAY'),
  ('a1a1a1a1-0008-0008-0008-000000000008', 'dddddddd-0004-0004-0004-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'ffffffff-0002-0002-0002-000000000002', '14:00', '15:30', 'THURSDAY')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- PAYMENT DB: Fee cycles (valid hex UUIDs)
-- =============================================================
\c payment_db

-- Aditya Kumar: Classical Dance (2500) + Vocal Music (2000) = 4500/month
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('b1b1b1b1-0001-0001-0001-000000000001', 'aaaaaaaa-0005-0005-0005-000000000005', 8, 2026, 4500.00, 4500.00, 0.00, 'PAID', '2026-08-01', '2026-08-10'),
  ('b1b1b1b1-0002-0002-0002-000000000002', 'aaaaaaaa-0005-0005-0005-000000000005', 9, 2026, 4500.00, 0.00, 4500.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Sneha Patel: Classical Dance (2500) + Watercolor (1800) = 4300/month
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('b1b1b1b1-0003-0003-0003-000000000003', 'aaaaaaaa-0006-0006-0006-000000000006', 8, 2026, 4300.00, 4300.00, 0.00, 'PAID', '2026-08-01', '2026-08-10'),
  ('b1b1b1b1-0004-0004-0004-000000000004', 'aaaaaaaa-0006-0006-0006-000000000006', 9, 2026, 4300.00, 2500.00, 1800.00, 'PARTIAL', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Rahul Singh: Vocal Music (2000)/month
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('b1b1b1b1-0005-0005-0005-000000000005', 'aaaaaaaa-0007-0007-0007-000000000007', 8, 2026, 2000.00, 2000.00, 0.00, 'PAID', '2026-08-01', '2026-08-10'),
  ('b1b1b1b1-0006-0006-0006-000000000006', 'aaaaaaaa-0007-0007-0007-000000000007', 9, 2026, 2000.00, 0.00, 2000.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Kavya Reddy: Bollywood Dance (2000) + Watercolor (1800) = 3800/month
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('b1b1b1b1-0007-0007-0007-000000000007', 'aaaaaaaa-0008-0008-0008-000000000008', 8, 2026, 3800.00, 3800.00, 0.00, 'PAID', '2026-08-01', '2026-08-10'),
  ('b1b1b1b1-0008-0008-0008-000000000008', 'aaaaaaaa-0008-0008-0008-000000000008', 9, 2026, 3800.00, 0.00, 3800.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;

-- Ananya Joshi: Classical Dance (2500) + Bollywood Dance (2000) = 4500/month
INSERT INTO student_fee_cycles (id, student_id, billing_month, billing_year, total_amount, paid_amount, outstanding_amount, status, generated_date, due_date) VALUES
  ('b1b1b1b1-0009-0009-0009-000000000009', 'aaaaaaaa-0009-0009-0009-000000000009', 8, 2026, 4500.00, 4500.00, 0.00, 'PAID', '2026-08-01', '2026-08-10'),
  ('b1b1b1b1-0010-0010-0010-000000000010', 'aaaaaaaa-0009-0009-0009-000000000009', 9, 2026, 4500.00, 0.00, 4500.00, 'UNPAID', '2026-09-01', '2026-09-10')
ON CONFLICT (student_id, billing_month, billing_year) DO NOTHING;


-- =============================================================
-- PAYMENT DB: Payments (August paid cycles)
-- =============================================================

INSERT INTO payments (id, fee_cycle_id, student_id, amount, payment_mode, transaction_reference, payment_date, remarks) VALUES
  (gen_random_uuid(), 'b1b1b1b1-0001-0001-0001-000000000001', 'aaaaaaaa-0005-0005-0005-000000000005', 4500.00, 'UPI', 'UPI2608001ADITYA', '2026-08-05 10:30:00', 'August fees paid in full'),
  (gen_random_uuid(), 'b1b1b1b1-0003-0003-0003-000000000003', 'aaaaaaaa-0006-0006-0006-000000000006', 4300.00, 'CASH', NULL, '2026-08-04 11:00:00', 'August fees paid in full'),
  (gen_random_uuid(), 'b1b1b1b1-0005-0005-0005-000000000005', 'aaaaaaaa-0007-0007-0007-000000000007', 2000.00, 'ONLINE', 'NEFT2608007RAHUL', '2026-08-07 09:15:00', 'August fees'),
  (gen_random_uuid(), 'b1b1b1b1-0007-0007-0007-000000000007', 'aaaaaaaa-0008-0008-0008-000000000008', 3800.00, 'UPI', 'UPI2608008KAVYA', '2026-08-03 16:45:00', 'August fees'),
  (gen_random_uuid(), 'b1b1b1b1-0009-0009-0009-000000000009', 'aaaaaaaa-0009-0009-0009-000000000009', 4500.00, 'CHEQUE', 'CHQ-20260802-001', '2026-08-02 12:00:00', 'August fees - cheque'),
  -- Sneha partial September
  (gen_random_uuid(), 'b1b1b1b1-0004-0004-0004-000000000004', 'aaaaaaaa-0006-0006-0006-000000000006', 2500.00, 'CASH', NULL, '2026-09-03 11:00:00', 'Partial payment - dance fees only')
ON CONFLICT DO NOTHING;


-- =============================================================
-- PAYMENT DB: Fee details for September cycles
-- =============================================================

-- Aditya Sep: Classical Dance + Vocal Music
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'b1b1b1b1-0002-0002-0002-000000000002', 'eeeeeeee-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001', 2500.00, 0.00, 2500.00, 'UNPAID'),
  (gen_random_uuid(), 'b1b1b1b1-0002-0002-0002-000000000002', 'eeeeeeee-0002-0002-0002-000000000002', 'cccccccc-0002-0002-0002-000000000002', 2000.00, 0.00, 2000.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Sneha Sep: Classical Dance (paid) + Watercolor (unpaid)
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'b1b1b1b1-0004-0004-0004-000000000004', 'eeeeeeee-0003-0003-0003-000000000003', 'cccccccc-0001-0001-0001-000000000001', 2500.00, 2500.00, 0.00, 'PAID'),
  (gen_random_uuid(), 'b1b1b1b1-0004-0004-0004-000000000004', 'eeeeeeee-0004-0004-0004-000000000004', 'cccccccc-0003-0003-0003-000000000003', 1800.00, 0.00, 1800.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Rahul Sep: Vocal Music
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'b1b1b1b1-0006-0006-0006-000000000006', 'eeeeeeee-0005-0005-0005-000000000005', 'cccccccc-0002-0002-0002-000000000002', 2000.00, 0.00, 2000.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Kavya Sep: Bollywood Dance + Watercolor
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'b1b1b1b1-0008-0008-0008-000000000008', 'eeeeeeee-0006-0006-0006-000000000006', 'cccccccc-0004-0004-0004-000000000004', 2000.00, 0.00, 2000.00, 'UNPAID'),
  (gen_random_uuid(), 'b1b1b1b1-0008-0008-0008-000000000008', 'eeeeeeee-0007-0007-0007-000000000007', 'cccccccc-0003-0003-0003-000000000003', 1800.00, 0.00, 1800.00, 'UNPAID')
ON CONFLICT DO NOTHING;

-- Ananya Sep: Classical Dance + Bollywood Dance
INSERT INTO student_fee_details (id, fee_cycle_id, enrollment_id, course_id, course_fee, allocated_paid_amount, outstanding_amount, status) VALUES
  (gen_random_uuid(), 'b1b1b1b1-0010-0010-0010-000000000010', 'eeeeeeee-0008-0008-0008-000000000008', 'cccccccc-0001-0001-0001-000000000001', 2500.00, 0.00, 2500.00, 'UNPAID'),
  (gen_random_uuid(), 'b1b1b1b1-0010-0010-0010-000000000010', 'eeeeeeee-0009-0009-0009-000000000009', 'cccccccc-0004-0004-0004-000000000004', 2000.00, 0.00, 2000.00, 'UNPAID')
ON CONFLICT DO NOTHING;

\echo '=== Schedule and payment data inserted ==='
