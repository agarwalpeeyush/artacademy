-- ACADEMY_SHARE WS2: teacher attribution + institute-share rule.
-- F5: enrollment stores its teacher directly (not derived from timetables). Tables are empty in
-- this greenfield DB, so the column can be added NOT NULL without a backfill.
ALTER TABLE ENROLLMENTS ADD COLUMN TEACHER_ID UUID NOT NULL;

-- F2/F3: institute-share rule on the course template (defaults) and the per-child enrollment line
-- (source of truth). Nullable: a null type means no institute cut for that line.
ALTER TABLE COURSE_FEES ADD COLUMN INSTITUTE_SHARE_TYPE VARCHAR(10) NULL;
ALTER TABLE COURSE_FEES ADD COLUMN INSTITUTE_SHARE_VALUE NUMERIC(12,2) NULL DEFAULT 0;

ALTER TABLE ENROLLMENT_FEES ADD COLUMN INSTITUTE_SHARE_TYPE VARCHAR(10) NULL;
ALTER TABLE ENROLLMENT_FEES ADD COLUMN INSTITUTE_SHARE_VALUE NUMERIC(12,2) NULL DEFAULT 0;
