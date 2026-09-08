# Reporting Service — Detail Design Document

## 1. Overview

The `reporting-service` is a read-optimised, event-sourced projection layer. It maintains four denormalised summary tables that are updated in near-real-time by consuming Kafka events from every other business service. It exposes a read-only HTTP API for dashboards and reports. It never writes to other services and never calls them via HTTP.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `reporting-service` |
| Package root | `com.artacademy.reporting` |
| Server port | **8088** local/dev · **8088** Docker container (host-mapped `8088:8088`) |
| Database | `reporting_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

---

## 3. Component Structure

```
com.artacademy.reporting
├── ReportingServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   └── KafkaConsumerConfig.java
├── controller
│   └── ReportController.java
├── domain
│   ├── StudentReport.java
│   ├── TeacherReport.java
│   ├── AttendanceSummary.java
│   └── RevenueSummary.java
├── dto
│   ├── StudentReportResponse.java
│   ├── TeacherReportResponse.java
│   ├── AttendanceSummaryResponse.java
│   ├── AttendanceExceptionResponse.java
│   ├── CourseAttendanceSummaryResponse.java
│   ├── RevenueSummaryResponse.java
│   └── DefaulterResponse.java
├── kafka
│   ├── UserEventConsumer.java
│   ├── EnrollmentEventConsumer.java
│   ├── AttendanceEventConsumer.java
│   └── PaymentEventConsumer.java
├── repository
│   ├── StudentReportRepository.java
│   ├── TeacherReportRepository.java
│   ├── AttendanceSummaryRepository.java
│   └── RevenueSummaryRepository.java
└── service
    └── ReportingService.java
```

---

## 4. Domain Model

### 4.1 `StudentReport`

One row per student, maintained as a running aggregate:

```
UUID          id
UUID          studentId          (unique)
String        firstName          (not null, max 200)
String        lastName           (max 200)
Integer       totalEnrollments   (default 0)
BigDecimal    activeFeeBalance   (default 0 — sum of outstanding fees)
LocalDateTime lastPaymentDate
```

### 4.2 `TeacherReport`

One row per teacher:

```
UUID    id
UUID    teacherId            (unique)
String  employeeCode
String  firstName
String  lastName
Integer totalClasses         (default 0)
Double  attendancePercentage (default 0.0)
```

### 4.3 `AttendanceSummary`

Monthly aggregate per subject (student or teacher), with an optional course dimension:

```
UUID    id
String  subjectType          ("STUDENT" or "TEACHER", max 20)
UUID    subjectId
String  subjectName          (not null, max 200)
UUID    courseId             (nullable — course dimension)
String  courseName           (nullable, max 200)
Integer attendanceMonth
Integer attendanceYear
Integer totalDays            (default 0)
Integer presentDays          (default 0)
Integer absentDays           (default 0)
Integer leaveDays            (default 0)

UNIQUE (subjectType, subjectId, attendanceMonth, attendanceYear)
```

`courseId`/`courseName` are nullable and additive (V3). Rows without a course fall into an "Unassigned" bucket at query time.

### 4.4 `RevenueSummary`

Monthly financial aggregate:

```
UUID        id
Integer     billingMonth
Integer     billingYear
BigDecimal  totalBilled      (default 0)
BigDecimal  totalCollected   (default 0)
BigDecimal  outstanding      (default 0)
Integer     studentCount     (default 0)

UNIQUE (billingMonth, billingYear)
```

---

## 5. Database Schema

Final state after V3 migration:

```sql
CREATE TABLE STUDENT_REPORT (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         UUID UNIQUE NOT NULL,
    first_name         VARCHAR(200) NOT NULL,
    last_name          VARCHAR(200),
    total_enrollments  INTEGER NOT NULL DEFAULT 0,
    active_fee_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_payment_date  TIMESTAMP
);

CREATE TABLE TEACHER_REPORT (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id            UUID UNIQUE NOT NULL,
    employee_code         VARCHAR(50),
    first_name            VARCHAR(100),
    last_name             VARCHAR(100),
    total_classes         INTEGER NOT NULL DEFAULT 0,
    attendance_percentage DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE ATTENDANCE_SUMMARY (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type     VARCHAR(20) NOT NULL,
    subject_id       UUID NOT NULL,
    subject_name     VARCHAR(200) NOT NULL,
    course_id        UUID,                 -- added in V3
    course_name      VARCHAR(200),         -- added in V3
    attendance_month INTEGER NOT NULL,
    attendance_year  INTEGER NOT NULL,
    total_days       INTEGER NOT NULL DEFAULT 0,
    present_days     INTEGER NOT NULL DEFAULT 0,
    absent_days      INTEGER NOT NULL DEFAULT 0,
    leave_days       INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_attendance_summary
        UNIQUE (subject_type, subject_id, attendance_month, attendance_year)
);

CREATE TABLE REVENUE_SUMMARY (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_month   INTEGER NOT NULL,
    billing_year    INTEGER NOT NULL,
    total_billed    NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_collected NUMERIC(10,2) NOT NULL DEFAULT 0,
    outstanding     NUMERIC(10,2) NOT NULL DEFAULT 0,
    student_count   INTEGER NOT NULL DEFAULT 0,
    UNIQUE (billing_month, billing_year)
);
```

`ddl-auto: validate` — the schema must match the JPA entities exactly.

---

## 6. REST API

Base path: `/reports`

All endpoints are read-only (`GET`) and require `PRINCIPAL`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/reports/attendance` | PRINCIPAL | Attendance summaries filtered by `subjectType`, optional month/year |
| `GET` | `/reports/attendance/exceptions` | PRINCIPAL | Subjects with attendance below a threshold percentage |
| `GET` | `/reports/attendance/monthly` | PRINCIPAL | Student attendance summary grouped by course for a month/year |
| `GET` | `/reports/attendance/export` | PRINCIPAL | Attendance report as a downloadable CSV (`text/csv`) |
| `GET` | `/reports/revenue` | PRINCIPAL | All revenue summaries ordered newest first |
| `GET` | `/reports/students` | PRINCIPAL | Paginated student reports |
| `GET` | `/reports/teachers` | PRINCIPAL | All teacher reports |
| `GET` | `/reports/fees` | PRINCIPAL | Revenue summary for a specific month/year |
| `GET` | `/reports/defaulters` | PRINCIPAL | Students with `activeFeeBalance > 0`, sorted by balance descending |

### Query Parameters

**`GET /reports/attendance`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `subjectType` | String | Yes | `STUDENT` or `TEACHER` |
| `month` | Integer | No | Filter by `attendanceMonth` |
| `year` | Integer | No | Filter by `attendanceYear` |

**`GET /reports/attendance/exceptions`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `threshold` | double | No (default `75`) | Attendance percentage floor; rows below are returned |
| `type` | String | No | `STUDENT` or `TEACHER` filter |
| `month` | Integer | No | Filter by `attendanceMonth` |
| `year` | Integer | No | Filter by `attendanceYear` |

Response is a list of `AttendanceExceptionResponse` (`subjectId`, `subjectName`, `subjectType`, `attendanceMonth`, `attendanceYear`, `totalDays`, `presentDays`, `attendancePercentage`).

**`GET /reports/attendance/monthly`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | Integer | Yes | Attendance month |
| `year` | Integer | Yes | Attendance year |

Response is a list of `CourseAttendanceSummaryResponse` (`courseId`, `courseName`, `attendanceMonth`, `attendanceYear`, `studentCount`, `totalDays`, `presentDays`, `attendancePercentage`).

**`GET /reports/attendance/export`**

Same params as `/reports/attendance` (`subjectType` required; `month`/`year` optional). Returns CSV with `Content-Disposition: attachment; filename=attendance-report.csv`.

**`GET /reports/students`**

Pagination: `page`, `size` (default 0 / 20).

**`GET /reports/fees`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | Integer | Yes | Billing month |
| `year` | Integer | Yes | Billing year |

---

## 7. Kafka Event Consumers

Consumer group: `reporting-service`. Topic names use **hyphens** (see `common-library/events/KafkaTopics.java`).

### `UserEventConsumer`

| Topic | Action |
|-------|--------|
| `student-created` | Insert `StudentReport` row with `studentId`, `firstName`, `lastName` (skips if one already exists) |
| `teacher-created` | Insert `TeacherReport` row with `teacherId`, `employeeCode`, `firstName`, `lastName` (skips if one already exists) |

### `EnrollmentEventConsumer`

| Topic | Action |
|-------|--------|
| `enrollment-created` | `StudentReport.totalEnrollments += 1` (find by `studentId`; warns if not found) |
| `enrollment-cancelled` | `StudentReport.totalEnrollments = max(0, totalEnrollments − 1)` |

### `AttendanceEventConsumer`

| Topic | Action |
|-------|--------|
| `attendance-recorded` | Upsert `AttendanceSummary` for `(subjectType, subjectId, month, year)` (month/year parsed from `attendanceDate`): set `courseId`/`courseName` if present, `totalDays += 1`, and increment `presentDays` / `absentDays` / `leaveDays` by `status` (`HALF_DAY` counts as present) |
| `attendance-updated` | If `oldStatus == newStatus`, no-op. Otherwise upsert the same summary, decrement the old-status bucket (floored at 0), and increment the new-status bucket; `totalDays` is unchanged |

### `PaymentEventConsumer`

| Topic | Action |
|-------|--------|
| `fee-generated` | Upsert `RevenueSummary(billingMonth, billingYear)`: `totalBilled += totalAmount`, `outstanding += totalAmount`, `studentCount += 1`; `StudentReport.activeFeeBalance += totalAmount` |
| `payment-received` | Derive month/year from `occurredAt`; `RevenueSummary.totalCollected += amount`, `outstanding -= amount`; `StudentReport.lastPaymentDate = occurredAt` and `activeFeeBalance -= amount` (floored at 0) |

There is **no** `fee-status-updated` consumer in reporting-service; that event is only relevant to other services. All consumers use find-or-create (upsert) semantics for summary rows keyed by their unique constraints.

---

## 8. Service Logic

`ReportingService` contains only read methods; it performs no writes. It maps domain entities to DTO responses and applies in-memory filtering, grouping, or CSV rendering not expressed in the JPA query.

| Method | Description |
|--------|-------------|
| `getAttendanceReport(subjectType, month, year)` | Attendance summaries for a type, optional month/year filter |
| `getAttendanceExceptions(threshold, subjectType, month, year)` | Rows whose computed attendance percentage is below `threshold` |
| `getMonthlyCourseSummary(month, year)` | Student summaries grouped by course for the month/year |
| `exportAttendanceCsv(subjectType, month, year)` | Renders the attendance report as CSV text |
| `getRevenueReport()` | Ordered by year DESC, month DESC |
| `getStudentReports(Pageable)` | Paginated |
| `getTeacherReports()` | All records |
| `getFeeReport(month, year)` | Single `RevenueSummary` row |
| `getDefaulters()` | `StudentReport` where `activeFeeBalance > 0`, sorted by balance descending |

---

## 9. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGINT IDs |
| V2 | All tables migrated to UUID PKs; unique constraints added |
| V3 | Added nullable `COURSE_ID` / `COURSE_NAME` to `ATTENDANCE_SUMMARY` (course dimension for grouped/monthly reporting) |
