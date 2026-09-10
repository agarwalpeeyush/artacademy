# Attendance Service — Detail Design Document

## 1. Overview

The Attendance Service records and manages daily attendance for students and
teachers in the Art Academy platform. It supports single and bulk marking of
student attendance, teacher attendance, a Principal-reviewed correction
workflow, and per-student attendance statistics. Class sessions are materialised
on demand so that every attendance record is anchored to a concrete
`(class, date)` session. State changes are broadcast to the rest of the platform
over Kafka (`attendance-recorded`, `attendance-updated`) where they are consumed
by the reporting and notification services.

Key capabilities:

- Mark one student, bulk-upsert a whole class session, and update individual records.
- Query a student's history (optionally by date range), a class roster for a date, and computed stats.
- Record teacher attendance as an upsert keyed by teacher + date.
- Submit attendance-correction requests (TEACHER/PRINCIPAL) and approve/reject them (PRINCIPAL only).
- Auto-create a `ClassSession` the first time attendance is marked for a `(class, date)` pair.

## 2. Module Coordinates

| Attribute | Value |
|-----------|-------|
| Service name | `attendance-service` |
| Package root | `com.artacademy.attendance` |
| HTTP port | `8084` |
| Database | `attendance_db` (PostgreSQL) |
| Runtime | Spring Boot 3.3.4, Java 21 |
| Config source | Spring Cloud Config (`optional:configserver:http://localhost:8888`) |
| Security | Stateless JWT (`JwtAuthenticationFilter` from `common-library`), method + URL role rules |
| Messaging | Apache Kafka (producer only) |
| Migrations | Flyway — `V1__init_attendance_schema.sql`, profile-gated `V2__seed_dev_data.sql` |

## 3. Component Structure

Package tree (from actual source under `src/main/java`):

```
com.artacademy.attendance
├── AttendanceServiceApplication.java         # @SpringBootApplication entry point
├── config
│   ├── KafkaProducerConfig.java              # String key + JSON value producer, idempotent, acks=all
│   └── SecurityConfig.java                   # JWT filter chain + role-based URL rules
├── controller
│   ├── StudentAttendanceController.java       # /attendance/students
│   ├── TeacherAttendanceController.java        # /attendance/teachers
│   └── AttendanceCorrectionController.java     # /attendance/corrections
├── domain
│   ├── StudentAttendance.java                # STUDENT_ATTENDANCE entity
│   ├── TeacherAttendance.java                # TEACHER_ATTENDANCE entity
│   ├── ClassSession.java                     # CLASS_SESSION entity
│   ├── AttendanceCorrection.java             # ATTENDANCE_CORRECTION entity
│   ├── AttendanceStatus.java                 # PRESENT / ABSENT / LEAVE / HALF_DAY
│   ├── ClassSessionStatus.java               # SCHEDULED / HELD / CANCELLED
│   └── CorrectionStatus.java                 # PENDING / APPROVED / REJECTED
├── dto
│   ├── StudentAttendanceRequest.java
│   ├── StudentAttendanceResponse.java
│   ├── StudentAttendanceStatsResponse.java
│   ├── TeacherAttendanceRequest.java
│   ├── TeacherAttendanceResponse.java
│   ├── AttendanceCorrectionRequest.java
│   ├── AttendanceCorrectionReviewRequest.java
│   └── AttendanceCorrectionResponse.java
├── mapper
│   ├── StudentAttendanceMapper.java
│   └── TeacherAttendanceMapper.java
├── repository
│   ├── StudentAttendanceRepository.java
│   ├── TeacherAttendanceRepository.java
│   ├── ClassSessionRepository.java
│   └── AttendanceCorrectionRepository.java
└── service
    ├── StudentAttendanceService.java
    ├── TeacherAttendanceService.java
    ├── ClassSessionService.java
    └── AttendanceCorrectionService.java
```

All controllers return the shared `com.artacademy.common.dto.ApiResponse<T>`
envelope. Errors are raised via `com.artacademy.common.exception.ApiException`
(`conflict`, `notFound`).

## 4. Domain Model

### 4.1 Entities

**StudentAttendance** (`STUDENT_ATTENDANCE`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK, generated |
| `studentId` | UUID | not null |
| `classId` | UUID | not null |
| `courseId` | UUID | nullable; back-filled from the session when null |
| `sessionId` | UUID | FK → `CLASS_SESSION.ID` |
| `attendanceDate` | LocalDate | not null |
| `status` | `AttendanceStatus` | not null, string enum |
| `remarks` | String (TEXT) | nullable |

Unique constraint: `(studentId, classId, attendanceDate)`.

**TeacherAttendance** (`TEACHER_ATTENDANCE`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK, generated |
| `teacherId` | UUID | not null |
| `attendanceDate` | LocalDate | not null |
| `status` | `AttendanceStatus` | not null, string enum |
| `remarks` | String (TEXT) | nullable |

Unique constraint: `(teacherId, attendanceDate)`.

**ClassSession** (`CLASS_SESSION`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK, generated |
| `classId` | UUID | not null |
| `courseId` | UUID | nullable |
| `sessionDate` | LocalDate | not null |
| `startTime` | LocalTime | nullable |
| `endTime` | LocalTime | nullable |
| `status` | `ClassSessionStatus` | not null; defaults to `SCHEDULED` |

Unique constraint: `(classId, sessionDate)`.

**AttendanceCorrection** (`ATTENDANCE_CORRECTION`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK, generated |
| `studentAttendanceId` | UUID | not null; target record |
| `studentId` | UUID | not null (copied from target) |
| `classId` | UUID | not null (copied from target) |
| `attendanceDate` | LocalDate | not null (copied from target) |
| `requestedStatus` | `AttendanceStatus` | not null |
| `reason` | String (TEXT) | nullable |
| `requestedByTeacherId` | UUID | not null |
| `status` | `CorrectionStatus` | not null; defaults to `PENDING` |
| `reviewedByPrincipalId` | UUID | nullable; set on review |
| `reviewNote` | String (TEXT) | nullable |
| `createdAt` | Instant | not null; stamped in `@PrePersist` |
| `reviewedAt` | Instant | nullable; set on review |

### 4.2 Enums

| Enum | Values |
|------|--------|
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LEAVE`, `HALF_DAY` |
| `ClassSessionStatus` | `SCHEDULED`, `HELD`, `CANCELLED` |
| `CorrectionStatus` | `PENDING`, `APPROVED`, `REJECTED` |

## 5. Database Schema

Flyway migration `V1__init_attendance_schema.sql`:

```sql
-- Attendance service schema (attendance_db).

CREATE TABLE CLASS_SESSION (
    ID           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    CLASS_ID     UUID NOT NULL,
    COURSE_ID    UUID,
    SESSION_DATE DATE NOT NULL,
    START_TIME   TIME,
    END_TIME     TIME,
    STATUS       VARCHAR(20) NOT NULL,
    CONSTRAINT uq_class_session_class_date UNIQUE (CLASS_ID, SESSION_DATE)
);

CREATE INDEX idx_class_session_class_id ON CLASS_SESSION (CLASS_ID);

CREATE TABLE STUDENT_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID      UUID NOT NULL,
    CLASS_ID        UUID NOT NULL,
    COURSE_ID       UUID,
    SESSION_ID      UUID,
    ATTENDANCE_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_student_attendance UNIQUE (STUDENT_ID, CLASS_ID, ATTENDANCE_DATE),
    CONSTRAINT fk_student_attendance_session FOREIGN KEY (SESSION_ID) REFERENCES CLASS_SESSION (ID)
);

CREATE INDEX idx_student_attendance_student_date ON STUDENT_ATTENDANCE (STUDENT_ID, ATTENDANCE_DATE);
CREATE INDEX idx_student_attendance_class_date ON STUDENT_ATTENDANCE (CLASS_ID, ATTENDANCE_DATE);

CREATE TABLE TEACHER_ATTENDANCE (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID      UUID NOT NULL,
    ATTENDANCE_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_teacher_attendance UNIQUE (TEACHER_ID, ATTENDANCE_DATE)
);

CREATE INDEX idx_teacher_attendance_date ON TEACHER_ATTENDANCE (ATTENDANCE_DATE);

CREATE TABLE ATTENDANCE_CORRECTION (
    ID                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ATTENDANCE_ID  UUID NOT NULL,
    STUDENT_ID             UUID NOT NULL,
    CLASS_ID               UUID NOT NULL,
    ATTENDANCE_DATE        DATE NOT NULL,
    REQUESTED_STATUS       VARCHAR(20) NOT NULL,
    REASON                 TEXT,
    REQUESTED_BY_TEACHER_ID UUID NOT NULL,
    STATUS                 VARCHAR(20) NOT NULL,
    REVIEWED_BY_PRINCIPAL_ID UUID,
    REVIEW_NOTE            TEXT,
    CREATED_AT             TIMESTAMP WITH TIME ZONE NOT NULL,
    REVIEWED_AT            TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_correction_status ON ATTENDANCE_CORRECTION (STATUS);
CREATE INDEX idx_correction_teacher ON ATTENDANCE_CORRECTION (REQUESTED_BY_TEACHER_ID);
```

Note: `ATTENDANCE_CORRECTION` stores `STUDENT_ATTENDANCE_ID` as a plain column
(no DB-level FK to `STUDENT_ATTENDANCE`); the linkage is enforced at the service
layer, which loads the target record before creating a correction.

## 6. REST API

All routes are relative to the service base (`http://localhost:8084` direct, or
via the API gateway at `http://localhost:8080`). All responses use the
`ApiResponse<T>` envelope. Roles are enforced in `SecurityConfig`.

### 6.1 Student attendance — `/attendance/students`

| Method | Path | Roles | Description | Success |
|--------|------|-------|-------------|---------|
| POST | `/attendance/students` | TEACHER, PRINCIPAL | Mark one student; rejects duplicate `(student, class, date)` | 201 |
| POST | `/attendance/students/bulk` | TEACHER, PRINCIPAL | Bulk upsert for a class session | 200 |
| PUT | `/attendance/students/{id}` | TEACHER, PRINCIPAL | Update status/remarks of a record | 200 |
| GET | `/attendance/students/{studentId}` | STUDENT, TEACHER, PRINCIPAL | History; optional `from`/`to` (ISO date) range | 200 |
| GET | `/attendance/students/{studentId}/stats` | STUDENT, TEACHER, PRINCIPAL | Stats; optional `classId` scope | 200 |
| GET | `/attendance/students/class/{classId}/date?date=YYYY-MM-DD` | STUDENT, TEACHER, PRINCIPAL | Class roster for a date | 200 |

Mark-one request body:

```json
{
  "studentId": "00000000-0000-0000-0003-000000000001",
  "classId": "00000000-0000-0000-0d01-000000000001",
  "courseId": "00000000-0000-0000-0c01-000000000001",
  "attendanceDate": "2026-09-09",
  "status": "PRESENT",
  "remarks": null
}
```

Bulk-mark request body (array of the same shape):

```json
[
  {
    "studentId": "00000000-0000-0000-0003-000000000001",
    "classId": "00000000-0000-0000-0d01-000000000001",
    "courseId": "00000000-0000-0000-0c01-000000000001",
    "attendanceDate": "2026-09-09",
    "status": "PRESENT"
  },
  {
    "studentId": "00000000-0000-0000-0003-000000000002",
    "classId": "00000000-0000-0000-0d01-000000000001",
    "courseId": "00000000-0000-0000-0c01-000000000001",
    "attendanceDate": "2026-09-09",
    "status": "ABSENT",
    "remarks": "Sick"
  }
]
```

`StudentAttendanceResponse`: `id, studentId, classId, courseId, sessionId,
attendanceDate, status, remarks`.
`StudentAttendanceStatsResponse`: `studentId, totalDays, presentDays,
absentDays, leaveDays, halfDays, attendancePercentage`.

### 6.2 Teacher attendance — `/attendance/teachers`

| Method | Path | Roles | Description | Success |
|--------|------|-------|-------------|---------|
| POST | `/attendance/teachers` | TEACHER, PRINCIPAL | Upsert attendance for teacher + date | 201 |
| GET | `/attendance/teachers/{teacherId}` | TEACHER, PRINCIPAL | History; optional `from`/`to` (ISO date) range | 200 |

Teacher-attendance request body:

```json
{
  "teacherId": "00000000-0000-0000-0002-000000000001",
  "attendanceDate": "2026-09-09",
  "status": "PRESENT",
  "remarks": null
}
```

### 6.3 Corrections — `/attendance/corrections`

| Method | Path | Roles | Description | Success |
|--------|------|-------|-------------|---------|
| POST | `/attendance/corrections` | TEACHER, PRINCIPAL | Submit a correction request (starts `PENDING`) | 201 |
| GET | `/attendance/corrections?status=PENDING` | TEACHER, PRINCIPAL | List, optional `status` filter | 200 |
| GET | `/attendance/corrections/teacher/{teacherId}` | TEACHER, PRINCIPAL | List by requesting teacher | 200 |
| PATCH | `/attendance/corrections/{id}/approve` | PRINCIPAL | Approve → apply requested status + publish event | 200 |
| PATCH | `/attendance/corrections/{id}/reject` | PRINCIPAL | Reject → mark `REJECTED` only | 200 |

Correction submit request body:

```json
{
  "studentAttendanceId": "00000000-0000-0000-1202-000000000002",
  "requestedStatus": "PRESENT",
  "reason": "Student was actually present; marked absent in error",
  "requestedByTeacherId": "00000000-0000-0000-0002-000000000001"
}
```

Correction review request body (approve/reject):

```json
{
  "reviewedByPrincipalId": "00000000-0000-0000-0001-000000000001",
  "reviewNote": "Verified against sign-in sheet"
}
```

`AttendanceCorrectionResponse`: `id, studentAttendanceId, studentId, classId,
attendanceDate, requestedStatus, reason, requestedByTeacherId, status,
reviewedByPrincipalId, reviewNote, createdAt, reviewedAt`.

## 7. Service Logic

### 7.1 Class-session auto-creation

`ClassSessionService.resolveOrCreate(classId, courseId, date)` looks up the
session by `(classId, sessionDate)`. If none exists, it builds a new
`ClassSession` (status defaults to `SCHEDULED`) and persists it. `courseId` is
only stamped when a session is created. Every single-record insert
(`StudentAttendanceService.insertRecord`) calls this and stamps the returned
`sessionId` onto the attendance row, back-filling `courseId` from the session
when the request omitted it.

### 7.2 Mark / bulk / update semantics

- **markAttendance** — checks `existsByStudentIdAndClassIdAndAttendanceDate`; on
  a duplicate it throws `ApiException.conflict`. Otherwise it inserts and
  publishes `attendance-recorded`.
- **markAttendanceBulk** — per item, an upsert: if a record for
  `(student, class, date)` exists it updates status + remarks and publishes
  `attendance-updated`; otherwise it inserts and publishes `attendance-recorded`.
  Safe to re-submit.
- **updateAttendance** — loads by id (404 if missing), updates status (and
  remarks when non-null), publishes `attendance-updated`.
- **Teacher upsert** — `TeacherAttendanceService.markAttendance` finds by
  `(teacherId, date)`; updates in place or creates new, then always publishes
  `attendance-recorded` (type `TEACHER`).

### 7.3 Stats math (half-day = 0.5)

`getStats` gathers records for the student (scoped to `classId` when given) and
computes:

```
total   = count(records)
present = count(status == PRESENT)
absent  = count(status == ABSENT)
leave   = count(status == LEAVE)
half    = count(status == HALF_DAY)
attendancePercentage = total == 0 ? 0.0
    : round( ((present + half * 0.5) / total) * 1000 ) / 10.0
```

`HALF_DAY` contributes 0.5 to the numerator; the percentage is rounded to one
decimal place. An empty history yields `0.0`.

### 7.4 Correction approve / reject flow

- **submit** — loads the target `StudentAttendance` (404 if missing), copies
  `studentId/classId/attendanceDate` onto a new `AttendanceCorrection` with
  status `PENDING`, and persists it.
- **approve** (PRINCIPAL) — loads the correction; requires it be `PENDING`
  (else `conflict`). Calls `StudentAttendanceService.applyCorrection`, which
  mutates the underlying record's `status` to `requestedStatus` and publishes
  `attendance-updated`. Then sets the correction to `APPROVED`, records
  `reviewedByPrincipalId`, `reviewNote`, and `reviewedAt`.
- **reject** (PRINCIPAL) — loads the correction; requires it be `PENDING`. Sets
  status `REJECTED`, records reviewer fields and `reviewedAt`. The underlying
  attendance record is **not** modified and **no** event is published.

## 8. Kafka Events Published

Producer config: String key (subject id), JSON value, `acks=all`, idempotent,
3 retries. Topic constants live in
`common-library/.../events/KafkaTopics.java`.

| Topic | Event class | Published when | Payload fields |
|-------|-------------|----------------|----------------|
| `attendance-recorded` | `AttendanceRecordedEvent` | Student marked (new insert); teacher upsert (always) | `attendanceType` (STUDENT/TEACHER), `subjectId`, `status`, `attendanceDate`, `courseId`, `courseName`, `occurredAt` |
| `attendance-updated` | `AttendanceUpdatedEvent` | Student record updated (bulk upsert of existing, single update, or correction approval) | `attendanceType`, `subjectId`, `oldStatus`, `newStatus`, `attendanceDate`, `courseId`, `courseName`, `occurredAt` |

The Kafka message key is the subject id (student or teacher) as a string.
Downstream consumers: **reporting-service** (attendance rollups) and
**notification-service** (absence alerts).

Example `attendance-recorded` payload:

```json
{
  "attendanceType": "STUDENT",
  "subjectId": "00000000-0000-0000-0003-000000000001",
  "status": "PRESENT",
  "attendanceDate": "2026-09-09",
  "courseId": "00000000-0000-0000-0c01-000000000001",
  "courseName": null,
  "occurredAt": "2026-09-09T10:15:00Z"
}
```

Example `attendance-updated` payload (from a correction approval):

```json
{
  "attendanceType": "STUDENT",
  "subjectId": "00000000-0000-0000-0003-000000000002",
  "oldStatus": "ABSENT",
  "newStatus": "PRESENT",
  "attendanceDate": "2026-09-07",
  "courseId": "00000000-0000-0000-0c01-000000000001",
  "courseName": null,
  "occurredAt": "2026-09-09T11:00:00Z"
}
```

## 9. Migrations

| Version | File | Scope | Contents |
|---------|------|-------|----------|
| V1 | `src/main/resources/db/migration/V1__init_attendance_schema.sql` | Always | Creates the four tables, unique constraints, FK, and indexes (clean-slate baseline). |
| V2 | `src/main/resources/db/seed/V2__seed_dev_data.sql` | docker/dev profile only | Idempotent seed: 2 class sessions, 4 student-attendance rows, 2 teacher-attendance rows for the seeded classes/students on recent dates (`ON CONFLICT ... DO NOTHING`). |

The seed lives on a separate migration location that is only registered under
the docker/dev profile, keeping production start-ups schema-only.
