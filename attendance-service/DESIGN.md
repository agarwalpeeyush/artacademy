# Attendance Service — Detail Design Document

## 1. Overview

The `attendance-service` records daily attendance for both students (per class) and teachers, and owns a teacher-driven **attendance-correction workflow** reviewed by the Principal. It also maintains a lightweight `CLASS_SESSION` record per `(class, date)` so attendance rows can be tied to a session and a course.

- **Student attendance** — strict-create for single marks (no duplicate `(student, class, date)`), plus a bulk upsert used when a teacher submits a whole class at once.
- **Teacher attendance** — upsert on `(teacher, date)`.
- **Corrections** — a teacher submits a correction request against an existing student record; the Principal approves (which mutates the record) or rejects it.

It publishes `AttendanceRecordedEvent` (new marks) and `AttendanceUpdatedEvent` (status changes) so the reporting and notification services can react asynchronously.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `attendance-service` |
| Package root | `com.artacademy.attendance` |
| Server port | **8084** local/dev · **8084** Docker container (host-mapped `8084:8084`) |
| Database | `attendance_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

---

## 3. Component Structure

```
com.artacademy.attendance
├── AttendanceServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   └── KafkaProducerConfig.java
├── controller
│   ├── StudentAttendanceController.java
│   ├── TeacherAttendanceController.java
│   └── AttendanceCorrectionController.java
├── domain
│   ├── AttendanceStatus.java        (enum)
│   ├── ClassSessionStatus.java      (enum)
│   ├── CorrectionStatus.java        (enum)
│   ├── StudentAttendance.java
│   ├── TeacherAttendance.java
│   ├── ClassSession.java
│   └── AttendanceCorrection.java
├── dto
│   ├── StudentAttendanceRequest.java / StudentAttendanceResponse.java
│   ├── StudentAttendanceStatsResponse.java
│   ├── TeacherAttendanceRequest.java / TeacherAttendanceResponse.java
│   ├── AttendanceCorrectionRequest.java / AttendanceCorrectionResponse.java
│   └── AttendanceCorrectionReviewRequest.java
├── mapper
│   ├── StudentAttendanceMapper.java  (MapStruct)
│   └── TeacherAttendanceMapper.java  (MapStruct)
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

---

## 4. Domain Model

### 4.1 Enums

```
AttendanceStatus    : PRESENT, ABSENT, LEAVE, HALF_DAY
ClassSessionStatus  : SCHEDULED, HELD, CANCELLED
CorrectionStatus    : PENDING, APPROVED, REJECTED
```

### 4.2 `StudentAttendance` (table `STUDENT_ATTENDANCE`)

```
UUID             id
UUID             studentId        (not null; logical FK → user-service, not DB-enforced)
UUID             classId          (not null; logical FK → course-enrollment-service)
UUID             courseId         (nullable; stamped from the class session when unknown)
UUID             sessionId        (nullable; FK → CLASS_SESSION.id)
LocalDate        attendanceDate   (not null)
AttendanceStatus status           (STRING, not null, max 20)
String           remarks          (TEXT)

UNIQUE (studentId, classId, attendanceDate)
```

### 4.3 `TeacherAttendance` (table `TEACHER_ATTENDANCE`)

```
UUID             id
UUID             teacherId        (not null)
LocalDate        attendanceDate   (not null)
AttendanceStatus status           (STRING, not null, max 20)
String           remarks          (TEXT)

UNIQUE (teacherId, attendanceDate)
```

### 4.4 `ClassSession` (table `CLASS_SESSION`)

One row per `(class, date)`, resolved-or-created the first time attendance is marked for that class on that day.

```
UUID                id
UUID                classId      (not null)
UUID                courseId     (nullable)
LocalDate           sessionDate  (not null)
LocalTime           startTime    (nullable)
LocalTime           endTime      (nullable)
ClassSessionStatus  status       (STRING, not null, max 20, default SCHEDULED)

UNIQUE (classId, sessionDate)
```

### 4.5 `AttendanceCorrection` (table `ATTENDANCE_CORRECTION`)

```
UUID             id
UUID             studentAttendanceId    (not null; the record being corrected)
UUID             studentId              (not null; copied from target)
UUID             classId                (not null; copied from target)
LocalDate        attendanceDate         (not null; copied from target)
AttendanceStatus requestedStatus        (STRING, not null, max 20)
String           reason                 (TEXT, nullable)
UUID             requestedByTeacherId   (not null)
CorrectionStatus status                 (STRING, not null, max 20, default PENDING)
UUID             reviewedByPrincipalId  (nullable; set on approve/reject)
String           reviewNote             (TEXT, nullable)
Instant          createdAt              (@PrePersist)
Instant          reviewedAt             (nullable; set on approve/reject)
```

---

## 5. Database Schema

Managed by Flyway. Final state after V4 (V5 seeds data only):

```sql
CREATE TABLE TEACHER_ATTENDANCE (
    ID              UUID         PRIMARY KEY,
    TEACHER_ID      UUID         NOT NULL,
    ATTENDANCE_DATE DATE         NOT NULL,
    STATUS          VARCHAR(20)  NOT NULL,
    REMARKS         TEXT,
    CONSTRAINT uq_teacher_attendance_teacher_date UNIQUE (TEACHER_ID, ATTENDANCE_DATE)
);
CREATE INDEX idx_teacher_attendance_date ON TEACHER_ATTENDANCE (ATTENDANCE_DATE);

CREATE TABLE STUDENT_ATTENDANCE (
    ID              UUID         PRIMARY KEY,
    STUDENT_ID      UUID         NOT NULL,
    CLASS_ID        UUID         NOT NULL,
    ATTENDANCE_DATE DATE         NOT NULL,
    STATUS          VARCHAR(20)  NOT NULL,
    REMARKS         TEXT,
    SESSION_ID      UUID,        -- added in V3
    COURSE_ID       UUID,        -- added in V3
    CONSTRAINT uq_student_attendance_student_class_date
        UNIQUE (STUDENT_ID, CLASS_ID, ATTENDANCE_DATE),
    CONSTRAINT fk_student_attendance_session
        FOREIGN KEY (SESSION_ID) REFERENCES CLASS_SESSION (ID)
);
CREATE INDEX idx_student_attendance_student_date ON STUDENT_ATTENDANCE (STUDENT_ID, ATTENDANCE_DATE);
CREATE INDEX idx_student_attendance_class_date   ON STUDENT_ATTENDANCE (CLASS_ID, ATTENDANCE_DATE);

CREATE TABLE CLASS_SESSION (
    ID           UUID         PRIMARY KEY,
    CLASS_ID     UUID         NOT NULL,
    COURSE_ID    UUID,
    SESSION_DATE DATE         NOT NULL,
    START_TIME   TIME,
    END_TIME     TIME,
    STATUS       VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED',
    CONSTRAINT uq_class_session_class_date UNIQUE (CLASS_ID, SESSION_DATE)
);
CREATE INDEX idx_class_session_class_date ON CLASS_SESSION (CLASS_ID, SESSION_DATE);

CREATE TABLE ATTENDANCE_CORRECTION (
    ID                       UUID         PRIMARY KEY,
    STUDENT_ATTENDANCE_ID    UUID         NOT NULL,
    STUDENT_ID               UUID         NOT NULL,
    CLASS_ID                 UUID         NOT NULL,
    ATTENDANCE_DATE          DATE         NOT NULL,
    REQUESTED_STATUS         VARCHAR(20)  NOT NULL,
    REASON                   TEXT,
    REQUESTED_BY_TEACHER_ID  UUID         NOT NULL,
    STATUS                   VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    REVIEWED_BY_PRINCIPAL_ID UUID,
    REVIEW_NOTE              TEXT,
    CREATED_AT               TIMESTAMP    NOT NULL,
    REVIEWED_AT              TIMESTAMP
);
CREATE INDEX idx_attendance_correction_status  ON ATTENDANCE_CORRECTION (STATUS);
CREATE INDEX idx_attendance_correction_teacher ON ATTENDANCE_CORRECTION (REQUESTED_BY_TEACHER_ID);
```

`ddl-auto: validate` — the schema must match the JPA entities exactly.

---

## 6. REST API

All responses use the shared `ApiResponse<T>` envelope.

### 6.1 Student Attendance — base `/attendance/students`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/attendance/students` | TEACHER, PRINCIPAL | Mark one student's attendance (`201`; `409` on duplicate) |
| `POST` | `/attendance/students/bulk` | TEACHER, PRINCIPAL | Bulk upsert a list of records for a class session (`200`) |
| `PUT` | `/attendance/students/{id}` | TEACHER, PRINCIPAL | Update a record's status/remarks |
| `GET` | `/attendance/students/{studentId}` | STUDENT, TEACHER, PRINCIPAL | Records for a student; optional `from`/`to` ISO-date range |
| `GET` | `/attendance/students/{studentId}/stats` | STUDENT, TEACHER, PRINCIPAL | Aggregate stats; optional `classId` scope |
| `GET` | `/attendance/students/class/{classId}/date` | STUDENT, TEACHER, PRINCIPAL | Records for a class on a specific `date` (required) |

#### `POST /attendance/students` — Request Body

```json
{
  "studentId": "<UUID>",
  "classId": "<UUID>",
  "courseId": "<UUID>",
  "attendanceDate": "2026-09-02",
  "status": "PRESENT",
  "remarks": ""
}
```

**Business rule:** if a record already exists for `(studentId, classId, attendanceDate)`, respond `409 Conflict`. Use `/bulk` or `PUT /{id}` to change an existing record.

#### `GET /attendance/students/{studentId}/stats` — Response `data`

```json
{
  "studentId": "<UUID>",
  "totalDays": 10,
  "presentDays": 8,
  "absentDays": 1,
  "leaveDays": 0,
  "halfDays": 1,
  "attendancePercentage": 85.0
}
```

Percentage = `round(((present + half*0.5) / total) * 1000) / 10` (one decimal place; `0.0` when no records).

### 6.2 Teacher Attendance — base `/attendance/teachers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/attendance/teachers` | TEACHER, PRINCIPAL | Mark or update teacher attendance (upsert; `201`) |
| `GET` | `/attendance/teachers/{teacherId}` | TEACHER, PRINCIPAL | Records for a teacher; optional `from`/`to` range |

**Upsert semantics:** if a record exists for `(teacherId, attendanceDate)` it is updated in place; otherwise a new one is created.

### 6.3 Attendance Corrections — base `/attendance/corrections`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/attendance/corrections` | TEACHER, PRINCIPAL | Submit a correction request (`201`) |
| `GET` | `/attendance/corrections` | TEACHER, PRINCIPAL | List requests; optional `status` filter |
| `GET` | `/attendance/corrections/teacher/{teacherId}` | TEACHER, PRINCIPAL | List requests submitted by a teacher |
| `PATCH` | `/attendance/corrections/{id}/approve` | PRINCIPAL | Approve (mutates the target record) |
| `PATCH` | `/attendance/corrections/{id}/reject` | PRINCIPAL | Reject (no record mutation) |

`POST` body is `AttendanceCorrectionRequest` (`studentAttendanceId`, `requestedStatus`, `reason`, `requestedByTeacherId`). Approve/reject bodies are `AttendanceCorrectionReviewRequest` (`reviewedByPrincipalId`, `reviewNote`).

---

## 7. Service Logic

### `StudentAttendanceService`

| Method | Logic |
|--------|-------|
| `markAttendance(request)` | `409` if `(studentId, classId, attendanceDate)` exists; else `insertRecord` + publish `ATTENDANCE_RECORDED` |
| `markAttendanceBulk(requests)` | Per item: if the record exists, update status/remarks + publish `ATTENDANCE_UPDATED`; otherwise insert + publish `ATTENDANCE_RECORDED` |
| `updateAttendance(id, request)` | `404` if missing; update status (and remarks if provided); publish `ATTENDANCE_UPDATED` |
| `getByStudent(id, from, to)` | All records for the student, date-range-filtered when both `from` and `to` are given |
| `getByClassAndDate(classId, date)` | Records for a class on a date |
| `getStats(studentId, classId)` | Counts by status; percentage as in §6.1 |
| `applyCorrection(attendanceId, newStatus)` | Set the record's status; publish `ATTENDANCE_UPDATED` (called by the approval workflow) |

`insertRecord` calls `ClassSessionService.resolveOrCreate(classId, courseId, date)`, stamps `sessionId`, and back-fills `courseId` from the session when the request omitted it.

### `TeacherAttendanceService`

Upsert on `(teacherId, attendanceDate)`; `getByTeacher(teacherId, from, to)` with optional date range.

### `ClassSessionService`

`resolveOrCreate(classId, courseId, date)` — return the existing `CLASS_SESSION` for `(classId, date)` or create a new one (status `SCHEDULED`); `courseId` is stamped only when a new session is created.

### `AttendanceCorrectionService`

| Method | Logic |
|--------|-------|
| `submit(request)` | Load target `StudentAttendance` (`404` if missing); copy `studentId`/`classId`/`attendanceDate`; persist `PENDING` correction |
| `listByStatus(status)` | All corrections, filtered by status when provided |
| `listByTeacher(teacherId)` | Corrections submitted by a teacher |
| `approve(id, review)` | Require `PENDING` (`409` otherwise); `applyCorrection` on the target record; set `APPROVED` + reviewer/note/`reviewedAt` |
| `reject(id, review)` | Require `PENDING` (`409` otherwise); set `REJECTED` + reviewer/note/`reviewedAt`; **no** record mutation |

---

## 8. Kafka Events Published

Topic names use **hyphens** (see `common-library/events/KafkaTopics.java`).

| Topic | Event | When |
|-------|-------|------|
| `attendance-recorded` | `AttendanceRecordedEvent` | A new student record is created (single mark or new bulk row) |
| `attendance-updated` | `AttendanceUpdatedEvent` | A student record's status changes (bulk update, `PUT`, or approved correction) |

Teacher attendance does **not** publish events. Events are keyed by `studentId`.

**`AttendanceRecordedEvent`:** `attendanceType="STUDENT"`, `subjectId=studentId`, `status`, `attendanceDate` (ISO string), `courseId` (nullable), `occurredAt`. `courseName` is part of the event contract but is **not** populated by this service.

**`AttendanceUpdatedEvent`:** `attendanceType="STUDENT"`, `subjectId=studentId`, `oldStatus`, `newStatus`, `attendanceDate`, `courseId` (nullable), `occurredAt`.

**Consumers:**
- `reporting-service` — upserts `AttendanceSummary` aggregate rows (both events).
- `notification-service` — absence alert when `attendanceType=STUDENT` and `status=ABSENT` (on `attendance-recorded`).

---

## 9. Security Configuration

CSRF disabled; sessions `STATELESS`; method security enabled; `JwtAuthenticationFilter` (common-library) before `UsernamePasswordAuthenticationFilter`. Public: `/actuator/**`, `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`. Rules mirror §6 (student/teacher writes → TEACHER/PRINCIPAL; correction review → PRINCIPAL; student reads → STUDENT/TEACHER/PRINCIPAL).

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema (BIGSERIAL IDs, B-tree indexes) |
| V2 | Drop/recreate with UUID primary keys; unique constraints + indexes retained |
| V3 | Add `CLASS_SESSION` (+ index); add `SESSION_ID` / `COURSE_ID` to `STUDENT_ATTENDANCE` (+ FK to session) |
| V4 | Add `ATTENDANCE_CORRECTION` (+ status & teacher indexes) |
| V5 | Seed sample student/teacher attendance with fixed UUIDs matching the other services' seeds (idempotent `ON CONFLICT DO NOTHING`); local/testing only |
