# Course Enrollment Service — Product Requirements Document

## Purpose

The Course Enrollment Service manages the Art Academy's academic catalog and the
enrollment of students into classes. It is the authoritative source for:

- **Courses** — the subjects the academy offers, with their fee structure and duration.
- **Classes** — concrete running batches of a course, each with a teacher, room and seat
  limit.
- **Enrollments** — which student is enrolled in which class of which course, and the
  status of that enrollment.

It safeguards academic integrity (no over-booked classes, no duplicate active
enrollments) and emits domain events so billing (payment-service) and analytics
(reporting-service) remain consistent without direct coupling.

## Scope

**In scope**

- CRUD for courses (create/update/delete restricted to Principal).
- CRUD for classes, including lookup by teacher (mutations restricted to Principal).
- Enrollment lifecycle: enroll, list (all / by student / by course / by class),
  soft-cancel, and status change (Principal or Teacher).
- Enforcement of class capacity and single-active-enrollment rules.
- Publishing `enrollment-created` and `enrollment-cancelled` Kafka events.

**Out of scope**

- Student, teacher and parent identity/profile management (user-service).
- Fee generation, invoicing and payment collection (payment-service — consumes events).
- Attendance capture, timetabling and room scheduling (respective services).
- Reporting/analytics aggregation (reporting-service — consumes events).

## Functional Requirements

| ID       | Requirement                                                                                          | Auth               |
|----------|------------------------------------------------------------------------------------------------------|--------------------|
| ACD-001  | List all courses, optionally filtered by `type`.                                                     | Authenticated      |
| ACD-002  | Retrieve a single course by id (404 if absent).                                                      | Authenticated      |
| ACD-003  | Create a course; reject a duplicate `courseCode` (409).                                              | PRINCIPAL          |
| ACD-004  | Update a course; reject a `courseCode` change that collides with another course (409).               | PRINCIPAL          |
| ACD-005  | Delete a course (hard delete).                                                                        | PRINCIPAL          |
| ACD-006  | List all classes.                                                                                     | Authenticated      |
| ACD-007  | Retrieve a single class by id (404 if absent).                                                        | Authenticated      |
| ACD-008  | List classes for a given teacher.                                                                     | Authenticated      |
| ACD-009  | Create a class; reject null/non-positive capacity (400).                                              | PRINCIPAL          |
| ACD-010  | Update a class; reject capacity below current active enrollment count (400).                          | PRINCIPAL          |
| ACD-011  | Delete a class; reject (409) while any active enrollment still references it.                          | PRINCIPAL          |
| ACD-012  | Enroll a student in a course/class; created enrollment is `ACTIVE`.                                   | PRINCIPAL, TEACHER |
| ACD-013  | Reject enrollment if the student already has an `ACTIVE` enrollment in that course (409).             | PRINCIPAL, TEACHER |
| ACD-014  | Reject enrollment if the target class is at capacity (400).                                          | PRINCIPAL, TEACHER |
| ACD-015  | Default `enrollmentDate` to today when the request omits it.                                          | PRINCIPAL, TEACHER |
| ACD-016  | List all enrollments, and by student / by course / by class.                                          | Authenticated      |
| ACD-017  | Soft-cancel an enrollment (status → `CANCELLED`); reject if already cancelled (409).                  | PRINCIPAL, TEACHER |
| ACD-018  | Change an enrollment's status to any allowed value; reject unknown/blank status (400).                | PRINCIPAL, TEACHER |
| ACD-019  | Publish `enrollment-created` after a successful enrollment.                                           | —                  |
| ACD-020  | Publish `enrollment-cancelled` after a soft-cancel.                                                    | —                  |

**Allowed enrollment statuses:** `ACTIVE`, `COMPLETED`, `DROPPED`, `SUSPENDED`,
`CANCELLED`.

## Business Rules

| Rule                      | Description                                                                                                                                                             |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Active-enrollment uniqueness | A student may hold at most one `ACTIVE` enrollment per course. Enforced in application code before insert (409), and backed by a DB `UNIQUE(STUDENT_ID, COURSE_ID)` constraint (one row per student+course regardless of status). |
| Class capacity            | Enrollment is refused (400) when the number of `ACTIVE` enrollments in the target class has reached its `capacity`. Only `ACTIVE` rows consume seats, so cancellations free capacity. |
| Capacity integrity        | A class cannot be created/updated with null or non-positive capacity, cannot be shrunk below its current active enrollment count, and cannot be deleted while active enrollments reference it. |
| Soft-cancel               | Cancelling an enrollment sets `STATUS='CANCELLED'` rather than deleting the row, preserving history for audit and reporting. A second cancel is rejected (409).          |
| Course code uniqueness    | `courseCode` is globally unique; create/update reject collisions (409).                                                                                                |
| Status normalization      | Status inputs are trimmed and upper-cased, then validated against the allowed set.                                                                                      |
| Event emission            | Enroll emits `enrollment-created`; soft-cancel emits `enrollment-cancelled`. Status changes via `PUT /{id}/status` do not emit events.                                  |

## Dependencies

| Dependency            | Direction | Purpose                                                                    |
|-----------------------|-----------|----------------------------------------------------------------------------|
| PostgreSQL `academic_db` | Owns      | Persistence for courses, classes and enrollments.                          |
| Config Server         | Consumes  | Central configuration (`course-enrollment-service.yml`, port 8083).        |
| Auth service / JWT    | Consumes  | Validates bearer tokens; roles `PRINCIPAL`, `TEACHER` gate mutating calls. |
| common-library        | Consumes  | Shared events, `ApiResponse`, `ApiException`, JWT filter/util, `KafkaTopics`. |
| Kafka                 | Produces  | `enrollment-created`, `enrollment-cancelled` topics.                       |
| payment-service       | Downstream | Consumes enrollment events to maintain its `ENROLLMENT_CACHE` for fees.    |
| reporting-service     | Downstream | Consumes enrollment events for analytics.                                  |
| API Gateway (8080)    | Upstream  | Routes external traffic to this service (direct port 8083).                |
