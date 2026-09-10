# Reporting Service — Detail Design Document

## 1. Overview

The **Reporting Service** is the read/analytics tier of the Art Academy platform. It is a
pure **CQRS read-model / event-sourced projection service**: it owns no transactional
domain of its own and never receives writes directly from peer services. Instead, it
**consumes domain events from Kafka** and continuously **materialises denormalised read
models** (projections) into its own database (`reporting_db`). All HTTP traffic against
the service is **read-only** and restricted to the `PRINCIPAL` role.

Key architectural properties:

- **Consumer-only Kafka role.** The service publishes **no** events. It subscribes to
  eight topics (student/teacher creation, enrollment lifecycle, attendance, fee/payment)
  and folds each event into the relevant projection.
- **Event-sourced projections.** The four tables (`STUDENT_REPORT`, `TEACHER_REPORT`,
  `REVENUE_SUMMARY`, `ATTENDANCE_SUMMARY`) are incrementally built from the event stream.
  Each event triggers an upsert (`findOrCreate` / increment / decrement) rather than a
  full recompute.
- **Eventually consistent.** Because projections are hydrated asynchronously as events
  arrive, reports lag the source-of-truth services until the corresponding events have
  been processed by the `reporting-service-group` consumer group.
- **No direct coupling.** Peer services do not call this service and this service does not
  call them; the only integration seam is the Kafka event stream and the shared
  `common-library` event/topic contracts.
- **Schema-only migration.** A single Flyway migration creates the projection tables.
  There is **no seed data** — the tables start empty and fill at runtime as events flow.

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| Module | `reporting-service` |
| Package root | `com.artacademy.reporting` |
| Spring Boot | 3.3.4 |
| Java | 21 |
| HTTP port | `8088` |
| Database | `reporting_db` (PostgreSQL, `jdbc:postgresql://localhost:15432/reporting_db`) |
| Kafka role | Consumer only |
| Kafka consumer group | `reporting-service-group` |
| Kafka offset reset | `earliest` |
| Migration tool | Flyway (`classpath:db/migration`) |
| JPA DDL | `validate` (schema is owned by Flyway) |
| Security | JWT bearer (`JwtAuthenticationFilter` from `common-library`), method-level `@PreAuthorize` |
| Config source | Config Server (`http://localhost:8888`), file `reporting-service.yml` |
| Discovery | Eureka (`@EnableDiscoveryClient`) |
| API base path | `/reports` |

## 3. Component Structure

Package tree (from actual source under `src/main/java`):

```
com.artacademy.reporting
├── ReportingServiceApplication.java        # @SpringBootApplication, @EnableDiscoveryClient
├── config
│   ├── KafkaConsumerConfig.java            # @EnableKafka; byte[] + ByteArrayJsonMessageConverter, concurrency=3
│   └── SecurityConfig.java                 # stateless JWT; /reports/** -> hasRole('PRINCIPAL')
├── controller
│   └── ReportController.java               # @RequestMapping("/reports"), all endpoints @PreAuthorize PRINCIPAL
├── domain                                  # JPA projection entities (read models)
│   ├── StudentReport.java
│   ├── TeacherReport.java
│   ├── RevenueSummary.java
│   └── AttendanceSummary.java
├── dto                                     # response payloads (Lombok @Data/@Builder)
│   ├── StudentReportResponse.java
│   ├── TeacherReportResponse.java
│   ├── RevenueSummaryResponse.java
│   ├── AttendanceSummaryResponse.java
│   ├── AttendanceExceptionResponse.java
│   ├── CourseAttendanceSummaryResponse.java
│   └── DefaulterResponse.java
├── kafka                                   # consumers only (no producers)
│   ├── UserEventConsumer.java              # student-created, teacher-created
│   ├── EnrollmentEventConsumer.java        # enrollment-created, enrollment-cancelled
│   ├── AttendanceEventConsumer.java        # attendance-recorded, attendance-updated
│   └── PaymentEventConsumer.java           # payment-received, fee-generated
├── repository
│   ├── StudentReportRepository.java        # findByStudentId, findDefaulters (JPQL)
│   ├── TeacherReportRepository.java        # findByTeacherId
│   ├── RevenueSummaryRepository.java       # findByBillingMonthAndBillingYear, ordered listing
│   └── AttendanceSummaryRepository.java    # by subject / by month+year
└── service
    └── ReportingService.java               # @Transactional(readOnly=true) query/aggregation logic
```

## 4. Domain Model

All four entities are **materialised read models** (projections), not authoritative
records. IDs are server-generated UUIDs (`GenerationType.UUID`).

### 4.1 StudentReport (`STUDENT_REPORT`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| id | ID | UUID | PK |
| studentId | STUDENT_ID | UUID | **unique**, not null |
| firstName | FIRST_NAME | varchar(200) | not null |
| lastName | LAST_NAME | varchar(200) | nullable |
| totalEnrollments | TOTAL_ENROLLMENTS | int | default 0 |
| activeFeeBalance | ACTIVE_FEE_BALANCE | numeric(12,2) | default 0 |
| lastPaymentDate | LAST_PAYMENT_DATE | timestamp | nullable |

### 4.2 TeacherReport (`TEACHER_REPORT`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| id | ID | UUID | PK |
| teacherId | TEACHER_ID | UUID | **unique**, not null |
| employeeCode | EMPLOYEE_CODE | varchar(50) | nullable |
| firstName | FIRST_NAME | varchar(200) | not null |
| lastName | LAST_NAME | varchar(200) | nullable |
| totalClasses | TOTAL_CLASSES | int | default 0 |
| attendancePercentage | ATTENDANCE_PERCENTAGE | numeric(5,2) | default 0 |

### 4.3 RevenueSummary (`REVENUE_SUMMARY`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| id | ID | UUID | PK |
| billingMonth | BILLING_MONTH | int | not null |
| billingYear | BILLING_YEAR | int | not null |
| totalBilled | TOTAL_BILLED | numeric(12,2) | default 0 |
| totalCollected | TOTAL_COLLECTED | numeric(12,2) | default 0 |
| outstanding | OUTSTANDING | numeric(12,2) | default 0 |
| studentCount | STUDENT_COUNT | int | default 0 |

Unique constraint `uq_revenue_summary (BILLING_MONTH, BILLING_YEAR)` — one row per billing period.

### 4.4 AttendanceSummary (`ATTENDANCE_SUMMARY`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| id | ID | UUID | PK |
| subjectType | SUBJECT_TYPE | varchar(20) | not null — `STUDENT` \| `TEACHER` |
| subjectId | SUBJECT_ID | UUID | not null |
| subjectName | SUBJECT_NAME | varchar(200) | not null (backfilled from report projections; `"Unknown"` until resolved) |
| courseId | COURSE_ID | UUID | nullable |
| courseName | COURSE_NAME | varchar(200) | nullable |
| attendanceMonth | ATTENDANCE_MONTH | int | not null |
| attendanceYear | ATTENDANCE_YEAR | int | not null |
| totalDays | TOTAL_DAYS | int | default 0 |
| presentDays | PRESENT_DAYS | int | default 0 |
| absentDays | ABSENT_DAYS | int | default 0 |
| leaveDays | LEAVE_DAYS | int | default 0 |

Unique constraint `uq_attendance_summary (SUBJECT_TYPE, SUBJECT_ID, ATTENDANCE_MONTH, ATTENDANCE_YEAR)` — one bucket per subject per month.

### 4.5 Enums / value conventions

There are no JPA enum types; the following are string/int conventions handled in code:

- **subjectType**: `STUDENT` \| `TEACHER` (compared case-insensitively).
- **attendance status** (from the source event, folded into day counters):
  `PRESENT`, `ABSENT`, `LEAVE`, `HALF_DAY` (counted as present). Unknown values are logged and ignored.
- **attendancePercentage** (read models & responses): derived as
  `round(presentDays / totalDays * 100, 1)`; `0.0` when `totalDays <= 0`.

## 5. Database Schema

Single migration: `src/main/resources/db/migration/V1__init_reporting_schema.sql`.

```sql
-- Reporting service schema (reporting_db). Kafka-projected; no seed.

CREATE TABLE STUDENT_REPORT (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID        UUID NOT NULL UNIQUE,
    FIRST_NAME        VARCHAR(200) NOT NULL,
    LAST_NAME         VARCHAR(200),
    TOTAL_ENROLLMENTS INTEGER NOT NULL,
    ACTIVE_FEE_BALANCE NUMERIC(12, 2) NOT NULL,
    LAST_PAYMENT_DATE TIMESTAMP
);

CREATE TABLE TEACHER_REPORT (
    ID                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID            UUID NOT NULL UNIQUE,
    EMPLOYEE_CODE         VARCHAR(50),
    FIRST_NAME            VARCHAR(200) NOT NULL,
    LAST_NAME             VARCHAR(200),
    TOTAL_CLASSES         INTEGER NOT NULL,
    ATTENDANCE_PERCENTAGE NUMERIC(5, 2) NOT NULL
);

CREATE TABLE REVENUE_SUMMARY (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    BILLING_MONTH   INTEGER NOT NULL,
    BILLING_YEAR    INTEGER NOT NULL,
    TOTAL_BILLED    NUMERIC(12, 2) NOT NULL,
    TOTAL_COLLECTED NUMERIC(12, 2) NOT NULL,
    OUTSTANDING     NUMERIC(12, 2) NOT NULL,
    STUDENT_COUNT   INTEGER NOT NULL,
    CONSTRAINT uq_revenue_summary UNIQUE (BILLING_MONTH, BILLING_YEAR)
);

CREATE TABLE ATTENDANCE_SUMMARY (
    ID               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    SUBJECT_TYPE     VARCHAR(20) NOT NULL,
    SUBJECT_ID       UUID NOT NULL,
    SUBJECT_NAME     VARCHAR(200) NOT NULL,
    COURSE_ID        UUID,
    COURSE_NAME      VARCHAR(200),
    ATTENDANCE_MONTH INTEGER NOT NULL,
    ATTENDANCE_YEAR  INTEGER NOT NULL,
    TOTAL_DAYS       INTEGER NOT NULL,
    PRESENT_DAYS     INTEGER NOT NULL,
    ABSENT_DAYS      INTEGER NOT NULL,
    LEAVE_DAYS       INTEGER NOT NULL,
    CONSTRAINT uq_attendance_summary UNIQUE (SUBJECT_TYPE, SUBJECT_ID, ATTENDANCE_MONTH, ATTENDANCE_YEAR)
);
```

> Note: the V1 migration defines primary keys, the implicit unique indexes on
> `STUDENT_ID` and `TEACHER_ID`, and the two composite unique constraints
> (`uq_revenue_summary`, `uq_attendance_summary`). No additional secondary indexes are
> declared; type/month lookups are served by Spring Data derived queries against these
> tables.

## 6. REST API

Base path `/reports`. **Every** endpoint requires `hasRole('PRINCIPAL')`
(`SecurityConfig` maps `/reports/**` to the `PRINCIPAL` role and each method carries
`@PreAuthorize("hasRole('PRINCIPAL')")`). Actuator and Swagger paths are public.

| Method | Path | Auth | Query params | Description |
|--------|------|------|--------------|-------------|
| GET | `/reports/attendance` | PRINCIPAL | `subjectType` (req), `month?`, `year?`, `startDate?`, `endDate?` | Attendance summaries for a subject type. If `startDate`+`endDate` given, aggregates per subject across the covered month span (YYYYMM resolution); else if `month`+`year` given, filters that period; otherwise returns all for the type. |
| GET | `/reports/attendance/exceptions` | PRINCIPAL | `threshold?` (default 75), `type?`, `month?`, `year?` | Subjects whose attendance % is below `threshold`. Rows with `totalDays = 0` excluded. |
| GET | `/reports/attendance/monthly` | PRINCIPAL | `month` (req), `year` (req) | STUDENT attendance for the month grouped by course; course-less rows bucketed as `"Unassigned"`. |
| GET | `/reports/attendance/export` | PRINCIPAL | `subjectType` (req), `month?`, `year?` | CSV download (`text/csv`, `Content-Disposition: attachment; filename=attendance-report.csv`). Header row: `Name,Total,Present,Absent,Leave,Attendance%`. |
| GET | `/reports/revenue` | PRINCIPAL | — | All revenue summaries, ordered by year DESC then month DESC. |
| GET | `/reports/students` | PRINCIPAL | `page?`, `size?` (default 20) | Paginated student reports (`Page<StudentReportResponse>`). |
| GET | `/reports/teachers` | PRINCIPAL | — | All teacher reports. |
| GET | `/reports/fees` | PRINCIPAL | `month` (req), `year` (req) | Revenue summary for the given billing month/year; returns a zeroed summary if none exists yet. |
| GET | `/reports/defaulters` | PRINCIPAL | — | Students with `activeFeeBalance > 0`, sorted by balance DESC. |

## 7. Projection Logic

Each consumed event folds into exactly one primary projection via upsert-and-increment.
There is no batch recompute — state is the accumulation of the event stream.

| Consumed event | Handler | Projection updated | Fields touched / effect |
|----------------|---------|--------------------|-------------------------|
| `student-created` | `UserEventConsumer.handleStudentCreated` | `STUDENT_REPORT` | Creates a row (studentId, firstName, lastName); counters default to 0. Skips if row already exists. |
| `teacher-created` | `UserEventConsumer.handleTeacherCreated` | `TEACHER_REPORT` | Creates a row (teacherId, employeeCode, firstName, lastName). Skips if row already exists. |
| `enrollment-created` | `EnrollmentEventConsumer.handleEnrollmentCreated` | `STUDENT_REPORT` | `totalEnrollments += 1` for the student; warns if no report exists. |
| `enrollment-cancelled` | `EnrollmentEventConsumer.handleEnrollmentCancelled` | `STUDENT_REPORT` | `totalEnrollments = max(0, totalEnrollments - 1)`. |
| `fee-generated` | `PaymentEventConsumer.handleFeeGenerated` | `REVENUE_SUMMARY` (+ `STUDENT_REPORT`) | For billing month/year: `totalBilled += amount`, `outstanding += amount`, `studentCount += 1`; student `activeFeeBalance += amount`. |
| `payment-received` | `PaymentEventConsumer.handlePaymentReceived` | `REVENUE_SUMMARY` (+ `STUDENT_REPORT`) | Period derived from event `occurredAt`: `totalCollected += amount`, `outstanding -= amount`; student `lastPaymentDate` set, `activeFeeBalance -= amount` (floored at 0). |
| `attendance-recorded` | `AttendanceEventConsumer.handleAttendanceRecorded` | `ATTENDANCE_SUMMARY` | Upserts bucket (subjectType, subjectId, month, year); `totalDays += 1`, increments PRESENT/ABSENT/LEAVE (HALF_DAY→present); backfills courseId/courseName and subjectName. |
| `attendance-updated` | `AttendanceEventConsumer.handleAttendanceUpdated` | `ATTENDANCE_SUMMARY` | Moves one day from `oldStatus` bucket to `newStatus` (decrement old, increment new); `totalDays` unchanged; no-op when status unchanged. |

Read-side aggregation notes:

- **attendancePercentage** is computed on read as `round(present / total * 100, 1)` (0 when total ≤ 0).
- **`/attendance` date range** groups rows per `subjectId` and sums day counters across the covered months (month-granularity, not per-day).
- **`/attendance/monthly`** groups STUDENT rows by `courseId`, summing present/total per course; null-course rows go to `"Unassigned"`.
- **`/fees`** returns a synthetic zeroed `RevenueSummaryResponse` when the period row is absent (projection not yet built).
- **subjectName backfill**: attendance buckets start as `"Unknown"` and are resolved from
  `STUDENT_REPORT`/`TEACHER_REPORT` once those projections exist.

## 8. Kafka Consumers

Consumer-only. The container factory (`KafkaConsumerConfig`) deserializes payloads as raw
`byte[]` via `ErrorHandlingDeserializer` and resolves each to the listener's Java type
with a `ByteArrayJsonMessageConverter` (producers emit JSON without type headers).
Concurrency = 3, `auto-offset-reset = earliest`, group `reporting-service-group`. Topic
constants come from `common-library` `com.artacademy.common.events.KafkaTopics`.

| Topic (KafkaTopics constant) | Event type | Consumer / handler |
|------------------------------|------------|--------------------|
| `student-created` (`STUDENT_CREATED`) | `StudentCreatedEvent` | `UserEventConsumer.handleStudentCreated` |
| `teacher-created` (`TEACHER_CREATED`) | `TeacherCreatedEvent` | `UserEventConsumer.handleTeacherCreated` |
| `enrollment-created` (`ENROLLMENT_CREATED`) | `EnrollmentCreatedEvent` | `EnrollmentEventConsumer.handleEnrollmentCreated` |
| `enrollment-cancelled` (`ENROLLMENT_CANCELLED`) | `EnrollmentCancelledEvent` | `EnrollmentEventConsumer.handleEnrollmentCancelled` |
| `attendance-recorded` (`ATTENDANCE_RECORDED`) | `AttendanceRecordedEvent` | `AttendanceEventConsumer.handleAttendanceRecorded` |
| `attendance-updated` (`ATTENDANCE_UPDATED`) | `AttendanceUpdatedEvent` | `AttendanceEventConsumer.handleAttendanceUpdated` |
| `payment-received` (`PAYMENT_RECEIVED`) | `PaymentReceivedEvent` | `PaymentEventConsumer.handlePaymentReceived` |
| `fee-generated` (`FEE_GENERATED`) | `FeeGeneratedEvent` | `PaymentEventConsumer.handleFeeGenerated` |

**Producers: none.** The service does not emit any Kafka events.

## 9. Migrations

- Managed by Flyway from `classpath:db/migration`; `spring.jpa.hibernate.ddl-auto = validate`.
- Single migration `V1__init_reporting_schema.sql` — **schema only**.
- **No `db/seed` folder and no seed data.** Projection tables (`STUDENT_REPORT`,
  `TEACHER_REPORT`, `REVENUE_SUMMARY`, `ATTENDANCE_SUMMARY`) start empty and are populated
  entirely at runtime as Kafka events are consumed. A freshly migrated database therefore
  returns empty reports until the source services have published events and the
  `reporting-service-group` consumer has processed them.
