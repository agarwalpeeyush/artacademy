# attendance-service — Product Requirements

Records and reports attendance for students and teachers against scheduled timetable slots, and keeps an audited trail of any corrections.

## Features by Role

### TEACHER
- Mark student attendance for a timetable slot on a given date (present, absent, leave, half-day), with optional start/end time and remarks.
- Mark attendance in bulk for a whole roster, including across a range of session dates.
- Record own teacher attendance.
- Correct student attendance directly (edits are audited).

### PRINCIPAL
- All teacher capabilities, plus:
- Record and correct teacher attendance directly (edits are audited).

### STUDENT / PARENT
- View a student's attendance history (optionally filtered by date range).
- View attendance statistics (optionally per course), where a half-day counts as 0.5.

## Key Behaviors

- Attendance is uniquely keyed to student/teacher + timetable slot + date, preventing duplicate records.
- Corrections are applied directly with no approval workflow, but every change is recorded with the old status, new status, reason, editor, and timestamp.
- Recording or updating attendance emits an event for downstream consumers.
