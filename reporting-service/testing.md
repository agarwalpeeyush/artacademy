# Reporting Service — Testing Guide

The reporting service is a **read-only, event-sourced projection service**. Its tables are
empty on a clean install and fill only as Kafka events are consumed by the
`reporting-service-group` consumer group. Keep this in mind for every scenario below:
**projections are eventually consistent and may lag** until the relevant events
(student/teacher created, enrollments, attendance, fees, payments) have flowed through
Kafka and been processed.

## Preconditions

- Services running: PostgreSQL (`reporting_db`), Kafka, Config Server (8888), Eureka,
  API Gateway (8080), and the reporting service (8088). The source services must be up so
  they can publish the events the projections are built from.
- **Access:** call either through the **gateway on `http://localhost:8080`** or **directly
  on `http://localhost:8088`**.
- **Auth:** obtain a JWT for a `PRINCIPAL` user (seeded admin `Admin@1234`) and send it as
  `Authorization: Bearer <token>`. All `/reports/**` endpoints require the `PRINCIPAL` role.
- To see non-empty data, first drive the source services so they emit events (create
  students/teachers, enrollments, record attendance, generate fees, receive payments), then
  allow a moment for the consumer to project them.

## Scenarios

| # | Scenario | Steps | Expected result |
|---|----------|-------|-----------------|
| 1 | Student reports (PRINCIPAL) | `GET /reports/students?page=0&size=20` as PRINCIPAL, after `student-created` events consumed | 200; paginated page of student reports (studentId, name, totalEnrollments, activeFeeBalance, lastPaymentDate). |
| 2 | Teacher reports (PRINCIPAL) | `GET /reports/teachers` after `teacher-created` events consumed | 200; list of teacher reports (employeeCode, name, totalClasses, attendancePercentage). |
| 3 | Revenue analytics | `GET /reports/revenue` after `fee-generated`/`payment-received` events | 200; summaries ordered by year DESC, month DESC (billed, collected, outstanding, studentCount). |
| 4 | Revenue reflects seeded payment | Ensure the seeded **August ₹5500 payment** has been published as `payment-received` and consumed, then `GET /reports/fees?month=8&year=<yr>` (or check `/reports/revenue`) | 200; the August summary reflects the ₹5500 in `totalCollected` (counted **once**, since projection is per-event and the period is keyed uniquely by month/year). |
| 5 | Fee summary — no data | `GET /reports/fees?month=1&year=2000` (a period with no projected data) | 200; zeroed summary (`totalBilled`/`totalCollected`/`outstanding` = 0, `studentCount` = 0) for that month/year. |
| 6 | Defaulters list | `GET /reports/defaulters` after fees generated without full payment | 200; students with `activeFeeBalance > 0`, sorted by balance descending. |
| 7 | Attendance — all for type | `GET /reports/attendance?subjectType=STUDENT` after `attendance-recorded` events | 200; all STUDENT attendance summaries with computed `attendancePercentage`. |
| 8 | Attendance filter by month/year | `GET /reports/attendance?subjectType=STUDENT&month=9&year=2026` | 200; only summaries for that month/year and subject type. |
| 9 | Attendance by date range | `GET /reports/attendance?subjectType=STUDENT&startDate=2026-09-01&endDate=2026-10-31` | 200; per-subject rows aggregated across the covered months (month granularity). |
| 10 | Attendance exceptions | `GET /reports/attendance/exceptions?threshold=75&type=STUDENT&month=9&year=2026` | 200; only subjects below 75% (rows with `totalDays = 0` excluded). |
| 11 | Monthly per-course summary | `GET /reports/attendance/monthly?month=9&year=2026` | 200; STUDENT attendance grouped by course; course-less rows appear under `"Unassigned"`. |
| 12 | CSV export downloads | `GET /reports/attendance/export?subjectType=STUDENT&month=9&year=2026` | 200; `Content-Type: text/csv`, `Content-Disposition: attachment; filename=attendance-report.csv`; body header row `Name,Total,Present,Absent,Leave,Attendance%`. |
| 13 | Non-principal blocked | Call any `/reports/**` endpoint with a STUDENT/TEACHER/PARENT token | 403 Forbidden. |
| 14 | Unauthenticated blocked | Call any `/reports/**` endpoint with no token | 401 Unauthorized. |
| 15 | Public endpoints | `GET /actuator/health`, `GET /swagger-ui.html` without a token | 200; permitted without authentication. |
| 16 | Eventual consistency / lag | Create a new student in the student service, then immediately `GET /reports/students` | The new student may be **absent** until `student-created` is consumed; re-query after a short delay and it appears. Attendance/fee/payment projections behave the same way. |

## Notes

- **Empty-until-events:** a freshly migrated `reporting_db` has no seed data. Reports return
  empty collections (and `/reports/fees` returns zeroed summaries) until the corresponding
  Kafka events have been produced and consumed.
- **Duplicate protection:** `student-created`/`teacher-created` are idempotent — replaying
  them does not create duplicate report rows.
- **Percentage math:** `attendancePercentage = round(present / total * 100, 1)`, `0.0` when
  `totalDays = 0`.
- **Consumer group:** offset reset is `earliest` for `reporting-service-group`, so a newly
  started consumer will replay retained topic history to rebuild projections.
