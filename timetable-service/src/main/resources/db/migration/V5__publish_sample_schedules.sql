-- V5__publish_sample_schedules.sql
-- Ensure the demo teacher schedules seeded in V4 are PUBLISHED.
-- V4 inserts them as PUBLISHED, but existing rows may have been left/reset to DRAFT,
-- which hides classes from the teacher "Mark Attendance" dropdown
-- (GET /schedules/teacher/{id} returns PUBLISHED schedules only).
-- Idempotent: only touches the fixed seed rows that are not already PUBLISHED.

UPDATE SCHEDULES
SET STATUS = 'PUBLISHED',
    PUBLISHED_AT = COALESCE(PUBLISHED_AT, NOW())
WHERE ID IN (
    '00000000-0000-0000-1101-000000000001',
    '00000000-0000-0000-1101-000000000002',
    '00000000-0000-0000-1102-000000000001',
    '00000000-0000-0000-1102-000000000002'
)
AND STATUS <> 'PUBLISHED';
