-- Step 8 cleanup (decision 8.2): admission is now an ADMISSION line in ENROLLMENT_FEES, which is
-- the single source of truth for what a student is billed. The standalone ADMISSION_FEE_PAID
-- boolean is dropped to avoid two divergent sources of admission truth; the AdmissionFeePaidEvent
-- consumer that maintained it is removed alongside this migration.
ALTER TABLE ENROLLMENTS DROP COLUMN IF EXISTS ADMISSION_FEE_PAID;
