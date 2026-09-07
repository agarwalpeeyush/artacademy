# Reporting Service — Detail Design Document

## 1. Overview

The `reporting-service` is a read-optimised, event-sourced projection layer. It maintains four denormalised summary tables that are updated in near-real-time by consuming Kafka events from every other business service. It exposes a read-only HTTP API for dashboards and reports. It never writes to other services and never calls them via HTTP.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `reporting-service` |
| Package root | `com.artacademy.reporting` |
| Server port | **8088** (registered in Eureka as `REPORTING-SERVICE`) |
| Database | `artacademy_reporting` (PostgreSQL) |

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
UUID        id
UUID        studentId          (unique)
String      firstName
String      lastName
Integer     totalEnrollments   (default 0)
BigDecimal  activeFeeBalance   (default 0 — sum of outstanding fees)
LocalDate   lastPaymentDate
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

Monthly aggregate per subject (student or teacher):

```
UUID    id
String  subjectType          ("STUDENT" or "TEACHER")
UUID    subjectId
String  subjectName
Integer attendanceMonth
Integer attendanceYear
Integer totalDays            (default 0)
Integer presentDays          (default 0)
Integer absentDays           (default 0)
Integer leaveDays            (default 0)

UNIQUE (subjectType, subjectId, attendanceMonth, attendanceYear)
```

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

Final state after V2 migration:

```sql
CREATE TABLE student_report (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID UNIQUE NOT NULL,
    first_name        VARCHAR(100),
    last_name         VARCHAR(100),
    total_enrollments INTEGER      NOT NULL DEFAULT 0,
    active_fee_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    last_payment_date  DATE
);

CREATE TABLE teacher_report (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id            UUID UNIQUE NOT NULL,
    employee_code         VARCHAR(50),
    first_name            VARCHAR(100),
    last_name             VARCHAR(100),
    total_classes         INTEGER NOT NULL DEFAULT 0,
    attendance_percentage DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE attendance_summary (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type     VARCHAR(20) NOT NULL,
    subject_id       UUID NOT NULL,
    subject_name     VARCHAR(200),
    attendance_month INTEGER NOT NULL,
    attendance_year  INTEGER NOT NULL,
    total_days       INTEGER NOT NULL DEFAULT 0,
    present_days     INTEGER NOT NULL DEFAULT 0,
    absent_days      INTEGER NOT NULL DEFAULT 0,
    leave_days       INTEGER NOT NULL DEFAULT 0,
    UNIQUE (subject_type, subject_id, attendance_month, attendance_year)
);

CREATE TABLE revenue_summary (
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

---

## 6. REST API

Base path: `/reports`

All endpoints are read-only (`GET`). All require authentication.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/reports/attendance` | PRINCIPAL, TEACHER | Attendance summaries filtered by type, optional month/year |
| `GET` | `/reports/revenue` | PRINCIPAL | All revenue summaries ordered newest first |
| `GET` | `/reports/students` | PRINCIPAL | Paginated student reports |
| `GET` | `/reports/teachers` | PRINCIPAL | All teacher reports |
| `GET` | `/reports/fees` | PRINCIPAL | Fee summary for a specific month/year |
| `GET` | `/reports/defaulters` | PRINCIPAL | Students with `activeFeeBalance > 0` |

### Query Parameters

**`GET /reports/attendance`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `subjectType` | String | Yes | `STUDENT` or `TEACHER` |
| `month` | Integer | No | Filter by `attendanceMonth` |
| `year` | Integer | No | Filter by `attendanceYear` |

**`GET /reports/students`**

Pagination: `page`, `size` (default 0 / 20).

**`GET /reports/fees`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | Integer | Yes | Billing month |
| `year` | Integer | Yes | Billing year |

---

## 7. Kafka Event Consumers

Consumer group: `reporting-service`.

### `UserEventConsumer`

| Topic | Action |
|-------|--------|
| `student.created` | Insert `StudentReport` row with `studentId`, `firstName`, `lastName`; default counters |
| `teacher.created` | Insert `TeacherReport` row with `teacherId`, `employeeCode`, `firstName`, `lastName` |

### `EnrollmentEventConsumer`

| Topic | Action |
|-------|--------|
| `enrollment.created` | `StudentReport.totalEnrollments += 1` (find by `studentId`) |
| `enrollment.cancelled` | `StudentReport.totalEnrollments -= 1` |

### `AttendanceEventConsumer`

| Topic | Action |
|-------|--------|
| `attendance.recorded` | Upsert `AttendanceSummary` for `(subjectType, subjectId, month, year)`: `totalDays += 1`; increment `presentDays`, `absentDays`, or `leaveDays` based on `status` |

### `PaymentEventConsumer`

| Topic | Action |
|-------|--------|
| `fee.generated` | Upsert `RevenueSummary(month, year)`: `totalBilled += totalAmount`, `outstanding += totalAmount`, `studentCount += 1`; update `StudentReport.activeFeeBalance += totalAmount` |
| `payment.received` | `RevenueSummary.totalCollected += amount`, `RevenueSummary.outstanding -= amount`; `StudentReport.activeFeeBalance -= amount`, `StudentReport.lastPaymentDate = paymentDate` |

All consumers use upsert semantics (find-or-create) for summary rows keyed by their unique constraints.

---

## 8. Service Logic

`ReportingService` contains only read methods; it performs no writes. It maps domain entities to DTO responses and applies any in-memory filtering or sorting not expressed in the JPA query.

| Method | Description |
|--------|-------------|
| `getAttendanceSummaries(type, month, year)` | Optional month/year filter |
| `getRevenueSummaries()` | Ordered by year DESC, month DESC |
| `getStudentReports(Pageable)` | Paginated |
| `getTeacherReports()` | All records |
| `getFeeSummary(month, year)` | Single `RevenueSummary` row |
| `getDefaulters()` | `StudentReport` where `activeFeeBalance > 0` |

---

## 9. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGINT IDs |
| V2 | All tables migrated to UUID PKs; unique constraints added |
