# Reporting Service - Design

Read-model service whose materialised views are built purely from Kafka events for the Art Academy platform.

- **Stack:** Spring Boot 3.3.4, Java 21, PostgreSQL (Flyway `validate`), Kafka, JWT via common-library.
- **Port:** 8088
- **Database:** `reporting_db`
- **Responses:** wrapped in `ApiResponse<T> {success, message, data}`.
- All endpoints are **PRINCIPAL-only**.

## Endpoints (`/reports`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/reports/attendance` | Attendance by subjectType (STUDENT\|TEACHER), month/year or date range |
| GET | `/reports/attendance/exceptions` | Subjects below threshold (default 75%) |
| GET | `/reports/attendance/monthly` | Attendance grouped by course |
| GET | `/reports/attendance/export` | Attendance export (CSV) |
| GET | `/reports/revenue` | Revenue by year/month DESC |
| GET | `/reports/students` | Student reports (paginated) |
| GET | `/reports/teachers` | Teacher reports |
| GET | `/reports/fees` | Revenue for a given month/year |
| GET | `/reports/defaulters` | Fee defaulters |

## Entities (materialised)

| Entity | Key fields | Constraints |
| --- | --- | --- |
| AttendanceSummary | subjectType, subjectId, subjectName, courseId, courseName, attendanceMonth, attendanceYear, totalDays, presentDays, absentDays, leaveDays | unique subjectType+subjectId+month+year |
| RevenueSummary | billingMonth, billingYear, totalBilled, totalCollected, outstanding, studentCount | unique month+year |
| StudentReport | studentId (unique), firstName, lastName, totalEnrollments, activeFeeBalance, lastPaymentDate | |
| TeacherReport | teacherId (unique), employeeCode, firstName, lastName, totalClasses, attendancePercentage | |

## Migrations

| Version | Description |
| --- | --- |
| V1__init_reporting_schema.sql | 4 tables |

## Kafka

**Produces:** none.

**Consumes:**

| Topic | Effect |
| --- | --- |
| attendance-recorded | Increment totalDays + status bucket |
| attendance-updated | Move day between status buckets |
| enrollment-created | StudentReport.totalEnrollments + 1 |
| enrollment-cancelled | StudentReport.totalEnrollments - 1 |
| payment-received | RevenueSummary.totalCollected/outstanding; StudentReport lastPaymentDate + balance |
| fee-generated | RevenueSummary.totalBilled/outstanding/studentCount; StudentReport balance |
| student-created | Create StudentReport |
| teacher-created | Create TeacherReport |
