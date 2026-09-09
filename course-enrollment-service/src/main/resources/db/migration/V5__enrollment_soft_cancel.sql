-- V5__enrollment_soft_cancel.sql
-- Support soft cancellation of enrollments: cancelling sets STATUS='CANCELLED'
-- instead of deleting the row, so enrollment history is preserved.
--
-- The old table-level UNIQUE(STUDENT_ID, COURSE_ID) blocked a student from
-- ever re-enrolling in a course they had cancelled. Replace it with a partial
-- unique index that only applies to ACTIVE rows, so a student may hold at most
-- one ACTIVE enrollment per course while any number of CANCELLED rows may exist.

ALTER TABLE ENROLLMENTS DROP CONSTRAINT IF EXISTS uq_enrollment_student_course;

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_student_course_active
    ON ENROLLMENTS (STUDENT_ID, COURSE_ID)
    WHERE STATUS = 'ACTIVE';
