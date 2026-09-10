# Attendance Service — Product Requirements Document

## Purpose

The Attendance Service is the system of record for daily attendance in the Art
Academy platform. It lets teachers and principals capture whether each student
attended a class on a given date, records teacher attendance, computes
attendance statistics, and provides a governed correction workflow so that
mistakes can be fixed only with Principal approval. Every recorded or corrected
attendance is emitted as a Kafka event so that reporting and notification
services stay in sync (e.g. absence alerts to parents).

## Scope

In scope:

- Marking student attendance one record at a time or in bulk per class session.
- Updating an existing student attendance record.
- Reading a student's attendance history (optionally by date range), a class
  roster for a date, and computed per-student statistics.
- Recording teacher attendance (upsert keyed by teacher + date) and reading it.
- Submitting, listing, approving, and rejecting attendance corrections.
- Auto-materialising a `ClassSession` per `(class, date)`.
- Publishing `attendance-recorded` and `attendance-updated` Kafka events.

Out of scope:

- Timetable/scheduling generation (owned by timetable-service).
- Enrollment and class-membership management (owned by enrollment-service).
- Attendance reports/dashboards and notifications (downstream consumers).
- Consuming events from other services (this service is a producer only).

## Functional Requirements

| ID | Requirement |
|----|-------------|
| ATT-01 | A TEACHER or PRINCIPAL can mark a single student's attendance for a `(student, class, date)` with a status of `PRESENT`, `ABSENT`, `LEAVE`, or `HALF_DAY`. |
| ATT-02 | Marking a single record for a `(student, class, date)` that already has one is rejected with a conflict (409). |
| ATT-03 | A TEACHER or PRINCIPAL can bulk-submit attendance for a class session; existing records are updated and missing ones are created (idempotent upsert). |
| ATT-04 | A TEACHER or PRINCIPAL can update the status/remarks of an existing student attendance record by id. |
| ATT-05 | The first time attendance is marked for a `(class, date)`, a `ClassSession` is auto-created (status `SCHEDULED`) and linked to the attendance record. |
| ATT-06 | A STUDENT, TEACHER, or PRINCIPAL can read a student's attendance history, optionally filtered by a `from`/`to` date range. |
| ATT-07 | A STUDENT, TEACHER, or PRINCIPAL can read the attendance roster for a class on a specific date. |
| ATT-08 | A STUDENT, TEACHER, or PRINCIPAL can retrieve computed attendance statistics for a student, optionally scoped to a single class. |
| ATT-09 | Attendance percentage counts `PRESENT` as 1.0 and `HALF_DAY` as 0.5 of the total records, rounded to one decimal place; an empty history yields 0.0. |
| ATT-10 | A TEACHER or PRINCIPAL can record teacher attendance for a `(teacher, date)`; a re-submission for the same pair updates the existing record (upsert). |
| ATT-11 | A TEACHER or PRINCIPAL can read a teacher's attendance history, optionally filtered by a `from`/`to` date range. |
| ATT-12 | A TEACHER or PRINCIPAL can submit an attendance-correction request against an existing student attendance record; it starts in `PENDING`. |
| ATT-13 | A TEACHER or PRINCIPAL can list correction requests (optionally filtered by status) and list corrections by requesting teacher. |
| ATT-14 | Only a PRINCIPAL can approve a correction; approval applies the `requestedStatus` to the underlying attendance record and marks the correction `APPROVED`. |
| ATT-15 | Only a PRINCIPAL can reject a correction; rejection marks it `REJECTED` and leaves the underlying record unchanged. |
| ATT-16 | Approving or rejecting a correction that is not `PENDING` is rejected with a conflict (409). |
| ATT-17 | Marking a new student record and recording teacher attendance publish `attendance-recorded`; updates, bulk-upsert of an existing record, and correction approval publish `attendance-updated`. |

## Business Rules

- **Student uniqueness**: at most one attendance record per `(studentId, classId, attendanceDate)`, enforced by DB unique constraint `uq_student_attendance` and a service-layer existence check for single marks.
- **Teacher uniqueness**: at most one attendance record per `(teacherId, attendanceDate)`, enforced by DB unique constraint `uq_teacher_attendance`; re-submits upsert the row.
- **Session uniqueness**: at most one `ClassSession` per `(classId, sessionDate)`, enforced by `uq_class_session_class_date`; sessions are created lazily on first mark.
- **Correction approval authority**: only a PRINCIPAL may approve or reject a correction. Teachers (and principals) may submit them.
- **Correction state gate**: a correction can only be approved or rejected while `PENDING`; otherwise the operation conflicts.
- **Approval is the only path that mutates history via correction**: rejection never changes the underlying record.
- **Half-day weighting**: `HALF_DAY` contributes 0.5 toward attendance percentage; `LEAVE` and `ABSENT` contribute 0.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| PostgreSQL `attendance_db` | Persistent store for all four tables |
| Apache Kafka | Publishes `attendance-recorded` and `attendance-updated` |
| Spring Cloud Config (`:8888`) | External configuration |
| `common-library` | `ApiResponse`, `ApiException`, `JwtAuthenticationFilter`, `KafkaTopics`, event classes |
| API gateway (`:8080`) | Front-door routing and JWT propagation |
| reporting-service (downstream) | Consumes attendance events for rollups |
| notification-service (downstream) | Consumes attendance events for absence alerts |
