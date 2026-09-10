# Reporting Service — Product Requirements Document

## Purpose

Provide the Art Academy platform with a **read-optimised analytics and reporting tier** for
principals. The service turns the operational event stream (students, teachers,
enrollments, attendance, fees, payments) into materialised dashboards and reports —
student/teacher registers, revenue analytics, fee defaulters, and attendance analytics —
without ever touching or writing back to the operational services.

## Scope

**In scope**

- Consuming domain events from Kafka and maintaining four projections
  (`STUDENT_REPORT`, `TEACHER_REPORT`, `REVENUE_SUMMARY`, `ATTENDANCE_SUMMARY`).
- Serving read-only reporting endpoints under `/reports` to `PRINCIPAL` users:
  student reports, teacher reports, revenue summaries, per-period fee summary, defaulters,
  and attendance analytics (by type/period/date-range, exceptions below threshold, monthly
  per-course rollup, and CSV export).

**Out of scope**

- Any create/update/delete of operational data (owned by student, teacher, enrollment,
  attendance, and finance services).
- Publishing Kafka events (this service is a consumer only).
- Serving non-principal roles (students, teachers, parents) directly.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| RPT-01 | Provide **student report data** for principal dashboards: per-student totals of enrollments, active fee balance, and last payment date, paginated (`GET /reports/students`). |
| RPT-02 | Provide **teacher report data**: per-teacher employee code, name, total classes, and attendance percentage (`GET /reports/teachers`). |
| RPT-03 | Provide **revenue analytics**: all monthly revenue summaries (billed, collected, outstanding, student count) ordered newest-first (`GET /reports/revenue`). |
| RPT-04 | Provide a **per-period fee summary** for a given billing month/year, returning a zeroed summary when no data has been projected yet (`GET /reports/fees`). |
| RPT-05 | Provide a **defaulters list**: students with an outstanding fee balance (> 0), sorted by balance descending (`GET /reports/defaulters`). |
| RPT-06 | Provide **attendance analytics** by subject type, filterable by month/year or by a start/end date range aggregated at month granularity (`GET /reports/attendance`). |
| RPT-07 | Provide a **monthly attendance summary** for students grouped by course, with an `"Unassigned"` bucket for course-less rows (`GET /reports/attendance/monthly`). |
| RPT-08 | Provide **attendance exceptions**: subjects whose attendance percentage falls below a configurable threshold (default 75), optionally scoped by type and period (`GET /reports/attendance/exceptions`). |
| RPT-09 | Provide **CSV export** of the attendance report for download (`GET /reports/attendance/export`, `text/csv`, attachment `attendance-report.csv`). |
| RPT-10 | Maintain all four projections purely from consumed Kafka events (student/teacher created, enrollment created/cancelled, attendance recorded/updated, fee generated, payment received). |

## Business Rules

- **Read-only.** The service exposes no write endpoints; all `/reports/**` operations are `GET`.
- **PRINCIPAL-only access.** Every `/reports/**` endpoint requires the `PRINCIPAL` role
  (enforced both at the URL matcher and via `@PreAuthorize`). Non-principal callers are
  rejected (403); unauthenticated callers are rejected (401). Actuator/Swagger are public.
- **Eventually consistent projections.** Report data reflects only events already consumed
  by the `reporting-service-group` consumer group. Newly created data in operational
  services becomes visible only after the corresponding event is produced and processed;
  reads may therefore lag.
- **Idempotent creation.** `student-created` / `teacher-created` create a projection row
  only when one does not already exist for that id.
- **Non-negative counters.** Enrollment and attendance decrements are floored at 0; a
  payment never drives `activeFeeBalance` below 0.
- **attendancePercentage** is computed as `round(present / total * 100, 1)`, and is `0.0`
  when `totalDays` is 0 (such rows are excluded from the exceptions report).
- **Fee summary fallback.** `GET /reports/fees` for a period with no projected data returns
  a summary with all monetary fields and student count set to zero.

## Dependencies

- **Kafka (consume only).** Subscribes to eight topics — `student-created`,
  `teacher-created`, `enrollment-created`, `enrollment-cancelled`, `attendance-recorded`,
  `attendance-updated`, `fee-generated`, `payment-received` — all defined in
  `common-library` `KafkaTopics`. **No events are produced.**
- **No direct DB writes from peers.** Other services never write to `reporting_db`; the
  service materialises its own tables solely from the event stream.
- **PostgreSQL** `reporting_db` for projection storage.
- **Config Server** (`reporting-service.yml`) for port, datasource, Kafka, and Flyway config.
- **Eureka** for service discovery; **API Gateway** (`8080`) for routed access.
- **common-library** for shared JWT security (`JwtAuthenticationFilter`) and event/topic contracts.
