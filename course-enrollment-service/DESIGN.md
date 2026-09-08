# Course Enrollment Service — Detail Design Document

## 1. Overview

The `course-enrollment-service` manages the academy's course catalogue, the class offerings (`CourseClass` — one running batch of a course), and student enrollment in those classes. It is the source of truth for what is taught, by whom, and who is enrolled. It publishes enrollment events that drive fee-generation caching and reporting.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `course-enrollment-service` |
| Package root | `com.artacademy.courseenrollment` |
| Server port | **8083** local/dev · **8083** Docker container (host-mapped `8083:8083`) |
| Database | `academic_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

---

## 3. Component Structure

```
com.artacademy.courseenrollment
├── CourseEnrollmentServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   └── KafkaProducerConfig.java
├── controller
│   ├── CourseController.java
│   ├── ClassController.java
│   └── EnrollmentController.java
├── domain
│   ├── Course.java
│   ├── CourseClass.java
│   └── Enrollment.java
├── dto
│   ├── CourseRequest.java / CourseResponse.java
│   ├── ClassRequest.java / ClassResponse.java
│   └── EnrollmentRequest.java / EnrollmentResponse.java
├── mapper
│   ├── CourseMapper.java      (MapStruct)
│   ├── ClassMapper.java       (MapStruct)
│   └── EnrollmentMapper.java  (MapStruct)
├── repository
│   ├── CourseRepository.java
│   ├── CourseClassRepository.java
│   └── EnrollmentRepository.java
└── service
    ├── CourseService.java
    ├── ClassService.java
    └── EnrollmentService.java
```

---

## 4. Domain Model

### 4.1 `Course` (table `COURSES`)

```
UUID        id
String      courseCode      (unique, not null, max 50)
String      courseName      (not null)
String      courseType      (max 50 — e.g. "PAINTING", "SCULPTURE")
String      description     (TEXT)
BigDecimal  monthlyFee      (NUMERIC(12,2))
BigDecimal  admissionFee    (NUMERIC(12,2))
Integer     durationMonths
String      status          (not null — ACTIVE | INACTIVE)
```

### 4.2 `CourseClass` (table `CLASSES`)

A specific running section (batch) of a course, with its own teacher, room, and seat limit.

```
UUID    id
UUID    courseId         (not null; FK → COURSES)
UUID    teacherId        (nullable; logical FK → user-service, not DB-enforced)
String  className        (not null — e.g. "Painting A - Morning")
String  roomNumber       (max 50)
Integer capacity         (seat limit; NOT NULL CHECK > 0 at DB level)
String  status           (not null — ACTIVE | INACTIVE)
```

### 4.3 `Enrollment` (table `ENROLLMENTS`)

```
UUID        id
UUID        studentId      (not null; logical FK → user-service)
UUID        courseId       (not null; FK → COURSES)
UUID        classId        (not null; FK → CLASSES)
LocalDate   enrollmentDate (not null; defaults to today when omitted)
String      status         (not null, max 20 — ACTIVE | CANCELLED)

UNIQUE (studentId, courseId)   -- prevents double-enrollment in the same course
```

---

## 5. Database Schema

Managed by Flyway. Final state after V2 (V3 seeds data only):

```sql
CREATE TABLE COURSES (
    ID              UUID           PRIMARY KEY,
    COURSE_CODE     VARCHAR(50)    NOT NULL UNIQUE,
    COURSE_NAME     VARCHAR(255)   NOT NULL,
    COURSE_TYPE     VARCHAR(50),
    DESCRIPTION     TEXT,
    MONTHLY_FEE     NUMERIC(12,2)  CHECK (MONTHLY_FEE >= 0),
    ADMISSION_FEE   NUMERIC(12,2)  CHECK (ADMISSION_FEE >= 0),
    DURATION_MONTHS INT,
    STATUS          VARCHAR(50)    NOT NULL
);

CREATE TABLE CLASSES (
    ID          UUID         PRIMARY KEY,
    COURSE_ID   UUID         NOT NULL REFERENCES COURSES(ID),
    TEACHER_ID  UUID,
    CLASS_NAME  VARCHAR(255) NOT NULL,
    ROOM_NUMBER VARCHAR(50),
    CAPACITY    INT          NOT NULL CHECK (CAPACITY > 0),
    STATUS      VARCHAR(50)  NOT NULL
);
CREATE INDEX idx_classes_course_id  ON CLASSES(COURSE_ID);
CREATE INDEX idx_classes_teacher_id ON CLASSES(TEACHER_ID);

CREATE TABLE ENROLLMENTS (
    ID              UUID        PRIMARY KEY,
    STUDENT_ID      UUID        NOT NULL,
    COURSE_ID       UUID        NOT NULL REFERENCES COURSES(ID),
    CLASS_ID        UUID        NOT NULL REFERENCES CLASSES(ID),
    ENROLLMENT_DATE DATE        NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    CONSTRAINT uq_enrollment_student_course UNIQUE (STUDENT_ID, COURSE_ID)
);
CREATE INDEX idx_enrollments_student_id ON ENROLLMENTS(STUDENT_ID);
CREATE INDEX idx_enrollments_course_id  ON ENROLLMENTS(COURSE_ID);
CREATE INDEX idx_enrollments_class_id   ON ENROLLMENTS(CLASS_ID);
```

`ddl-auto: validate` — the schema must match the JPA entities exactly.

---

## 6. REST API

All responses use the shared `ApiResponse<T>` envelope.

### 6.1 Courses — base `/courses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses` | Any authenticated | List courses; optional `?type=PAINTING` filter |
| `GET` | `/courses/{id}` | Any authenticated | Get course by UUID (`404` if missing) |
| `POST` | `/courses` | PRINCIPAL | Create course (`201`) |
| `PUT` | `/courses/{id}` | PRINCIPAL | Update course |
| `DELETE` | `/courses/{id}` | PRINCIPAL | Delete course (hard delete) |

#### `POST /courses` — Request Body

```json
{
  "courseCode": "PAINT-101",
  "courseName": "Foundations of Painting",
  "courseType": "PAINTING",
  "description": "Colour theory, brushwork and composition.",
  "monthlyFee": 2500.00,
  "admissionFee": 1000.00,
  "durationMonths": 12,
  "status": "ACTIVE"
}
```

### 6.2 Classes — base `/classes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/classes` | Any authenticated | List all classes |
| `GET` | `/classes/{id}` | Any authenticated | Get class by UUID (`404` if missing) |
| `POST` | `/classes` | PRINCIPAL | Create class (`201`) |
| `PUT` | `/classes/{id}` | PRINCIPAL | Update class |
| `DELETE` | `/classes/{id}` | PRINCIPAL | Delete class (hard delete) |

#### `POST /classes` — Request Body

```json
{
  "courseId": "<UUID>",
  "teacherId": "<UUID>",
  "className": "Painting A - Morning",
  "roomNumber": "R1",
  "capacity": 20,
  "status": "ACTIVE"
}
```

### 6.3 Enrollments — base `/enrollments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/enrollments` | PRINCIPAL | Enroll a student (`201`) |
| `GET` | `/enrollments/student/{studentId}` | Any authenticated | Enrollments for a student |
| `GET` | `/enrollments/course/{courseId}` | Any authenticated | Enrollments for a course |
| `DELETE` | `/enrollments/{id}` | PRINCIPAL | Cancel an enrollment |

#### `POST /enrollments` — Request Body

```json
{
  "studentId": "<UUID>",
  "courseId": "<UUID>",
  "classId": "<UUID>",
  "enrollmentDate": "2025-06-01",
  "status": "ACTIVE"
}
```

**Business rules:**
- `409 Conflict` if an active enrollment already exists for `(studentId, courseId)`.
- `404` if `classId` does not exist; `400` if the class is at capacity (`countByClassId >= capacity`).

---

## 7. Service Logic

### `CourseService`

| Method | Logic |
|--------|-------|
| `getAllCourses()` / `getCoursesByType(type)` | All courses, or filtered by `courseType` |
| `getCourseById(id)` | Load or `404` |
| `createCourse(request)` | `409` if `courseCode` exists; save |
| `updateCourse(id, request)` | Load; `409` if the new `courseCode` collides with another course; save |
| `deleteCourse(id)` | Load; hard delete |

### `ClassService`

| Method | Logic |
|--------|-------|
| `getAllClasses()` / `getClassById(id)` | Read; `404` on missing id |
| `createClass(request)` | `400` if `capacity` is null or ≤ 0; save |
| `updateClass(id, request)` | `400` if `capacity` null/≤0; `400` if new `capacity` < current active enrollment count; save |
| `deleteClass(id)` | Load; hard delete |

> **Note (documented as-implemented):** `deleteClass` performs an unconditional hard delete — there is **no** active-enrollment guard, despite what a class-with-enrollments scenario might suggest. Since `ENROLLMENTS.CLASS_ID` has an FK to `CLASSES`, deleting a class that still has enrollment rows will fail at the database level rather than with a friendly `400`.

### `EnrollmentService`

| Method | Logic |
|--------|-------|
| `enrollStudent(request)` | `409` on duplicate active `(studentId, courseId)`; `404` if class missing; `400` if at capacity; save `ACTIVE` (default `enrollmentDate` = today); publish `EnrollmentCreatedEvent` |
| `cancelEnrollment(id)` | Load (`404` if missing); **hard delete** the row; publish `EnrollmentCancelledEvent` |
| `getEnrollmentsByStudentId(studentId)` | All enrollments for a student |
| `getEnrollmentsByCourseId(courseId)` | All enrollments for a course |

> **Note (documented as-implemented):** cancellation is a **hard delete**, not a soft `status = CANCELLED` update — the row is removed and history is not preserved. `CANCELLED` exists as a valid status value but is not written by this flow.

---

## 8. Kafka Events Published

Topic names use **hyphens** (see `common-library/events/KafkaTopics.java`).

| Topic | Event | When |
|-------|-------|------|
| `enrollment-created` | `EnrollmentCreatedEvent` (`enrollmentId`, `studentId`, `courseId`, `classId`, `occurredAt`) | After enrollment persist |
| `enrollment-cancelled` | `EnrollmentCancelledEvent` (`enrollmentId`, `studentId`, `courseId`, `occurredAt`) | After the enrollment row is deleted |

**Consumers:**
- `payment-service` — maintains its `ENROLLMENT_CACHE` for fee generation.
- `reporting-service` — increments / decrements `StudentReport.totalEnrollments`.

---

## 9. Security Configuration

CSRF disabled; sessions `STATELESS`; method security enabled; `JwtAuthenticationFilter` (common-library) before `UsernamePasswordAuthenticationFilter`. Public: `/actuator/**`, `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`. All `POST`/`PUT`/`DELETE` on `/courses`, `/classes`, `/enrollments` require `PRINCIPAL`; all `GET`s require any authenticated user.

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema (BIGSERIAL IDs) |
| V2 | Drop/recreate with UUID primary keys; FK + unique constraints + indexes |
| V3 | Seed sample courses, classes, and enrollments with fixed UUIDs shared across services (idempotent `ON CONFLICT DO NOTHING`); local/testing only |
