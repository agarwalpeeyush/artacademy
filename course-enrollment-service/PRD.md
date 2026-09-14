# course-enrollment-service — Product Requirements

The academic backbone of Art Academy. It defines the course catalog, enrolls students, captures fees at enrollment time, schedules recurring weekly timetable slots, and manages exams. There is no "class" concept — scheduling is done directly against courses and timetable slots.

## Features by Role

### PRINCIPAL
- Manage the course catalog: create, update, and delete courses and course types.
- Define course fees (fee type, amount, cadence).
- Create, update, and delete weekly timetable slots (day of week, start/end time, teacher).
- Detect scheduling conflicts (teacher double-booking, course overlap).
- Schedule exams for a course.
- Enroll students, adjust enrollment status, override fee lines, and assign timetable slots.

### TEACHER
- Enroll students into courses.
- View timetables and rosters for their assigned slots.

### STUDENT / PARENT
- View enrollments and the associated timetable slots.
- View upcoming sessions projected onto calendar dates.

## Key Behaviors

- Fees are snapshotted onto the enrollment at enrol time, so later catalog changes do not alter existing enrollments.
- A student can be enrolled in a given course only once (unique student + course).
- Enrolling emits an event carrying the full fee set for downstream billing/notification.
- Student and teacher names are enriched from the user-service so responses are human-readable.
