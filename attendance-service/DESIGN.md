# Attendance Service — Detail Design Document

## 1. Overview

The `attendance-service` records daily attendance for both students (per class) and teachers. It supports upsert semantics for teacher attendance (mark or update on the same day) and strict-create semantics for student attendance (no duplicate same-day records). It publishes `AttendanceRecordedEvent` so the reporting and notification services can react asynchronously.

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
│   └── TeacherAttendanceController.java
├── domain
│   ├── AttendanceStatus.java  (enum)
│   ├── StudentAttendance.java
│   └── TeacherAttendance.java
├── dto
│   ├── StudentAttendanceRequest.java
│   ├── StudentAttendanceResponse.java
│   ├── TeacherAttendanceRequest.java
│   └── TeacherAttendanceResponse.java
├── mapper
│   ├── StudentAttendanceMapper.java  (MapStruct)
│   └── TeacherAttendanceMapper.java  (MapStruct)
├── repository
│   ├── StudentAttendanceRepository.java
│   └── TeacherAttendanceRepository.java
└── service
    ├── StudentAttendanceService.java
    └── TeacherAttendanceService.java
```

---

## 4. Domain Model

### 4.1 `AttendanceStatus` (enum)

```
PRESENT
ABSENT
LEAVE
HALF_DAY
```

### 4.2 `StudentAttendance`

```
UUID             id
UUID             studentId           (FK → user-service, not DB enforced)
UUID             classId             (FK → course-enrollment-service)
LocalDate        attendanceDate
AttendanceStatus status
String           remarks

UNIQUE (studentId, classId, attendanceDate)
```

### 4.3 `TeacherAttendance`

```
UUID             id
UUID             teacherId           (FK → user-service, not DB enforced)
LocalDate        attendanceDate
AttendanceStatus status
String           remarks

UNIQUE (teacherId, attendanceDate)
```

---

## 5. Database Schema

Final state after V2 migration:

```sql
CREATE TABLE student_attendance (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL,
    class_id         UUID NOT NULL,
    attendance_date  DATE NOT NULL,
    status           VARCHAR(20) NOT NULL,
    remarks          TEXT,
    UNIQUE (student_id, class_id, attendance_date)
);
CREATE INDEX idx_sa_student_date ON student_attendance (student_id, attendance_date);
CREATE INDEX idx_sa_class_date   ON student_attendance (class_id, attendance_date);

CREATE TABLE teacher_attendance (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id       UUID NOT NULL,
    attendance_date  DATE NOT NULL,
    status           VARCHAR(20) NOT NULL,
    remarks          TEXT,
    UNIQUE (teacher_id, attendance_date)
);
CREATE INDEX idx_ta_teacher_date ON teacher_attendance (teacher_id, attendance_date);
```

---

## 6. REST API

### 6.1 Student Attendance Endpoints

Base path: `/attendance/student`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/attendance/student` | TEACHER, PRINCIPAL | Mark student attendance |
| `GET` | `/attendance/student/{studentId}` | TEACHER, PRINCIPAL, STUDENT | Get records for a student |

**Query parameters for GET:**
- `fromDate` (optional, ISO date) — filter start
- `toDate` (optional, ISO date) — filter end

#### `POST /attendance/student` — Request Body

```json
{
  "studentId": "<UUID>",
  "classId": "<UUID>",
  "attendanceDate": "2024-11-05",
  "status": "PRESENT",
  "remarks": ""
}
```

**Business rule:** If a record already exists for `(studentId, classId, attendanceDate)`, throw `409 Conflict`. Use the update endpoint (teacher attendance PUT) instead.

---

### 6.2 Teacher Attendance Endpoints

Base path: `/attendance/teacher`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/attendance/teacher` | PRINCIPAL | Mark or update teacher attendance (upsert) |
| `GET` | `/attendance/teacher/{teacherId}` | TEACHER, PRINCIPAL | Get records for a teacher |

#### `POST /attendance/teacher` — Request Body

```json
{
  "teacherId": "<UUID>",
  "attendanceDate": "2024-11-05",
  "status": "PRESENT",
  "remarks": ""
}
```

**Upsert semantics:** If a record already exists for `(teacherId, attendanceDate)`, it is updated in place. Otherwise a new record is created.

---

## 7. Service Logic

### `StudentAttendanceService`

| Method | Logic |
|--------|-------|
| `markAttendance(request)` | Check for existing record with same `(studentId, classId, attendanceDate)` → throw `409`; save; publish `AttendanceRecordedEvent(type=STUDENT)` |
| `getByStudentId(studentId, from, to)` | Query by `studentId`; if `from`/`to` provided, add date range predicate |

### `TeacherAttendanceService`

| Method | Logic |
|--------|-------|
| `markOrUpdateAttendance(request)` | Find by `(teacherId, attendanceDate)` → if exists update fields; if not create new; save; publish `AttendanceRecordedEvent(type=TEACHER)` |
| `getByTeacherId(teacherId, from, to)` | Query by `teacherId` with optional date range |
| `getByTeacherAndDate(teacherId, date)` | Find single record (used internally) |

---

## 8. Kafka Events Published

| Topic | Event | When |
|-------|-------|------|
| `attendance.recorded` | `AttendanceRecordedEvent` | After each mark/upsert |

**`AttendanceRecordedEvent` payload:**
```
attendanceType : "STUDENT" or "TEACHER"
subjectId      : studentId or teacherId
status         : AttendanceStatus.name()
attendanceDate : LocalDate
occurredAt     : Instant
```

**Consumers:**
- `reporting-service` — updates `AttendanceSummary` aggregate rows
- `notification-service` — sends absence alert when `type=STUDENT` and `status=ABSENT`

---

## 9. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGSERIAL IDs and B-tree indexes |
| V2 | Migrated to UUID primary keys; maintained unique constraints and indexes |
