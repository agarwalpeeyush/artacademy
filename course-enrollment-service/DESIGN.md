# Course Enrollment Service — Detail Design Document

## 1. Overview

The **Course Enrollment Service** is the academic-catalog and enrollment backbone of
the Art Academy platform. It owns three closely-related aggregates:

- **Courses** — *what* is taught (e.g. "Painting"), with fee structure and duration.
- **Classes** — a concrete running section/batch of a course, bound to a teacher, room,
  seat capacity and date range.
- **Enrollments** — the link between a student, a course and a specific class.

The service exposes REST APIs for CRUD on courses and classes, and for enrolling
students, listing enrollments and changing enrollment status. It enforces the key
academic invariants (class capacity, single active enrollment per student+course) and
publishes Kafka events so downstream services (payment, reporting) stay in sync.

It is a stateless Spring Boot 3.3.4 / Java 21 service backed by a dedicated PostgreSQL
database (`academic_db`) and secured by JWT bearer tokens issued by the auth service.

## 2. Module Coordinates

| Property           | Value                                                     |
|--------------------|-----------------------------------------------------------|
| Service name       | `course-enrollment-service`                               |
| HTTP port          | `8083`                                                    |
| Database           | `academic_db` (PostgreSQL, `jdbc:postgresql://localhost:15432/academic_db`) |
| Package root       | `com.artacademy.courseenrollment`                         |
| Config source      | Config Server (`course-enrollment-service.yml`), `optional:configserver:http://localhost:8888` |
| Migrations         | Flyway — `classpath:db/migration` (+ `db/seed` on `docker` profile) |
| Schema management  | Hibernate `ddl-auto: validate` (Flyway owns the schema)   |
| Kafka role         | Producer (`enrollment-created`, `enrollment-cancelled`)   |
| Security           | Stateless JWT, method/URL role checks (`PRINCIPAL`, `TEACHER`) |
| Runtime deps       | common-library (events, `ApiResponse`, `ApiException`, JWT filter) |

## 3. Component Structure

Package tree derived from the actual source files under
`src/main/java/com/artacademy/courseenrollment`:

```
com.artacademy.courseenrollment
├── CourseEnrollmentServiceApplication.java
├── config
│   ├── KafkaProducerConfig.java        // producer factory + KafkaTemplate<String,Object>
│   └── SecurityConfig.java             // stateless JWT filter chain + URL role rules
├── controller
│   ├── CourseController.java           // /courses
│   ├── ClassController.java            // /classes
│   └── EnrollmentController.java       // /enrollments
├── domain
│   ├── Course.java                     // @Entity COURSES
│   ├── CourseClass.java                // @Entity CLASSES
│   └── Enrollment.java                 // @Entity ENROLLMENTS
├── dto
│   ├── CourseRequest.java  / CourseResponse.java
│   ├── ClassRequest.java   / ClassResponse.java
│   ├── EnrollmentRequest.java / EnrollmentResponse.java
│   └── EnrollmentStatusRequest.java
├── mapper
│   ├── CourseMapper.java
│   ├── ClassMapper.java
│   └── EnrollmentMapper.java
├── repository
│   ├── CourseRepository.java
│   ├── CourseClassRepository.java
│   └── EnrollmentRepository.java
└── service
    ├── CourseService.java
    ├── ClassService.java
    └── EnrollmentService.java
```

## 4. Domain Model

### 4.1 Course (`COURSES`)

| Field           | Type         | Column          | Notes                                   |
|-----------------|--------------|-----------------|-----------------------------------------|
| id              | UUID         | ID              | PK, generated (`@UuidGenerator`)        |
| courseCode      | String       | COURSE_CODE     | unique, not null, ≤ 50 chars            |
| courseName      | String       | COURSE_NAME     | not null                                |
| courseType      | String       | COURSE_TYPE     | ≤ 50 chars (e.g. `ART`)                 |
| description     | String       | DESCRIPTION     | TEXT                                    |
| monthlyFee      | BigDecimal   | MONTHLY_FEE     | NUMERIC(12,2)                            |
| admissionFee    | BigDecimal   | ADMISSION_FEE   | NUMERIC(12,2)                            |
| durationMonths  | Integer      | DURATION_MONTHS |                                         |
| status          | String       | STATUS          | not null (e.g. `ACTIVE`)                |

### 4.2 CourseClass (`CLASSES`)

A `CourseClass` is one running section (batch) of a `Course` — the same course can have
multiple classes with different teachers, rooms and seat limits.

| Field       | Type       | Column       | Notes                                        |
|-------------|------------|--------------|----------------------------------------------|
| id          | UUID       | ID           | PK, generated                                |
| courseId    | UUID       | COURSE_ID    | not null, FK → COURSES(ID)                    |
| teacherId   | UUID       | TEACHER_ID   | nullable; logical ref to user-service         |
| className   | String     | CLASS_NAME   | not null                                     |
| roomNumber  | String     | ROOM_NUMBER  |                                              |
| roomId      | UUID       | ROOM_ID      |                                              |
| roomName    | String     | ROOM_NAME    |                                              |
| capacity    | Integer    | CAPACITY     | seat limit enforced at enroll time           |
| startDate   | LocalDate  | START_DATE   |                                              |
| endDate     | LocalDate  | END_DATE     |                                              |
| status      | String     | STATUS       | not null                                     |
| course      | Course     | (COURSE_ID)  | `@ManyToOne` LAZY, read-only join            |

### 4.3 Enrollment (`ENROLLMENTS`)

| Field           | Type        | Column          | Notes                                   |
|-----------------|-------------|-----------------|-----------------------------------------|
| id              | UUID        | ID              | PK, generated                           |
| studentId       | UUID        | STUDENT_ID      | not null; logical ref to user-service   |
| courseId        | UUID        | COURSE_ID       | not null, FK → COURSES(ID)              |
| classId         | UUID        | CLASS_ID        | not null, FK → CLASSES(ID)             |
| enrollmentDate  | LocalDate   | ENROLLMENT_DATE | not null (defaults to today if omitted) |
| status          | String      | STATUS          | not null, ≤ 20 chars                    |
| course          | Course      | (COURSE_ID)     | `@ManyToOne` LAZY, read-only join       |
| courseClass     | CourseClass | (CLASS_ID)      | `@ManyToOne` LAZY, read-only join       |

**Enrollment status values:** `ACTIVE`, `COMPLETED`, `DROPPED`, `SUSPENDED`, `CANCELLED`.

The entity declares a table-level unique constraint
`uq_enrollment_student_course UNIQUE (STUDENT_ID, COURSE_ID)`.

## 5. Database Schema

Actual `V1__init_academic_schema.sql`:

```sql
-- Course-enrollment service schema (academic_db).

CREATE TABLE COURSES (
    ID              UUID PRIMARY KEY,
    COURSE_CODE     VARCHAR(50) NOT NULL UNIQUE,
    COURSE_NAME     VARCHAR(255) NOT NULL,
    COURSE_TYPE     VARCHAR(50),
    DESCRIPTION     TEXT,
    MONTHLY_FEE     NUMERIC(12, 2),
    ADMISSION_FEE   NUMERIC(12, 2),
    DURATION_MONTHS INTEGER,
    STATUS          VARCHAR(255) NOT NULL
);

CREATE TABLE CLASSES (
    ID          UUID PRIMARY KEY,
    COURSE_ID   UUID NOT NULL,
    TEACHER_ID  UUID,
    CLASS_NAME  VARCHAR(255) NOT NULL,
    ROOM_NUMBER VARCHAR(255),
    ROOM_ID     UUID,
    ROOM_NAME   VARCHAR(255),
    CAPACITY    INTEGER,
    START_DATE  DATE,
    END_DATE    DATE,
    STATUS      VARCHAR(255) NOT NULL,
    CONSTRAINT fk_classes_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID)
);

CREATE INDEX idx_classes_course_id ON CLASSES (COURSE_ID);
CREATE INDEX idx_classes_teacher_id ON CLASSES (TEACHER_ID);

CREATE TABLE ENROLLMENTS (
    ID              UUID PRIMARY KEY,
    STUDENT_ID      UUID NOT NULL,
    COURSE_ID       UUID NOT NULL,
    CLASS_ID        UUID NOT NULL,
    ENROLLMENT_DATE DATE NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    CONSTRAINT uq_enrollment_student_course UNIQUE (STUDENT_ID, COURSE_ID),
    CONSTRAINT fk_enrollments_course FOREIGN KEY (COURSE_ID) REFERENCES COURSES (ID),
    CONSTRAINT fk_enrollments_class FOREIGN KEY (CLASS_ID) REFERENCES CLASSES (ID)
);

CREATE INDEX idx_enrollments_student_id ON ENROLLMENTS (STUDENT_ID);
CREATE INDEX idx_enrollments_course_id ON ENROLLMENTS (COURSE_ID);
CREATE INDEX idx_enrollments_class_id ON ENROLLMENTS (CLASS_ID);
```

> **Note on uniqueness:** the schema enforces a *full* unique constraint on
> `(STUDENT_ID, COURSE_ID)` — a student can have **at most one** enrollment row per
> course, regardless of status. The stronger business rule "only one *ACTIVE* enrollment
> per student+course" is enforced in application code (see §7.2). The current migration
> does **not** contain a partial (`WHERE STATUS='ACTIVE'`) unique index; the DB constraint
> is unconditional.

## 6. REST API

All endpoints return the common envelope `ApiResponse<T>` and require a valid JWT
(`Authorization: Bearer <token>`) except the public actuator/Swagger paths. Roles are
enforced by `SecurityConfig` URL rules.

### 6.1 `/courses`

| Method | Path            | Auth          | Description                                 |
|--------|-----------------|---------------|---------------------------------------------|
| GET    | `/courses`      | Authenticated | List all courses; optional `?type=` filter  |
| GET    | `/courses/{id}` | Authenticated | Get a course by id (404 if missing)         |
| POST   | `/courses`      | PRINCIPAL     | Create a course (201)                       |
| PUT    | `/courses/{id}` | PRINCIPAL     | Update a course                             |
| DELETE | `/courses/{id}` | PRINCIPAL     | Delete a course (hard delete)               |

### 6.2 `/classes`

| Method | Path                           | Auth          | Description                     |
|--------|--------------------------------|---------------|---------------------------------|
| GET    | `/classes`                     | Authenticated | List all classes                |
| GET    | `/classes/{id}`                | Authenticated | Get a class by id (404 if missing) |
| GET    | `/classes/teacher/{teacherId}` | Authenticated | List classes for a teacher      |
| POST   | `/classes`                     | PRINCIPAL     | Create a class (201)            |
| PUT    | `/classes/{id}`                | PRINCIPAL     | Update a class                  |
| DELETE | `/classes/{id}`                | PRINCIPAL     | Delete a class                  |

### 6.3 `/enrollments`

| Method | Path                        | Auth               | Description                       |
|--------|-----------------------------|--------------------|-----------------------------------|
| POST   | `/enrollments`              | PRINCIPAL, TEACHER | Enroll a student (201)            |
| GET    | `/enrollments`              | Authenticated      | List all enrollments              |
| GET    | `/enrollments/student/{id}` | Authenticated      | List enrollments for a student    |
| GET    | `/enrollments/course/{id}`  | Authenticated      | List enrollments for a course     |
| GET    | `/enrollments/class/{id}`   | Authenticated      | List enrollments for a class      |
| DELETE | `/enrollments/{id}`         | PRINCIPAL, TEACHER | Soft-cancel an enrollment (§7.3)  |
| PUT    | `/enrollments/{id}/status`  | PRINCIPAL, TEACHER | Change an enrollment's status     |

> The `POST /enrollments` OpenAPI summary reads "PRINCIPAL only" but the enforced
> `SecurityConfig` rule allows both `PRINCIPAL` and `TEACHER` (`hasAnyRole`). The security
> rule is authoritative.

### 6.4 Request bodies

**Create Course** — `POST /courses`

```json
{
  "courseCode": "PAINT-101",
  "courseName": "Painting",
  "courseType": "ART",
  "description": "Foundations of painting",
  "monthlyFee": 2500.00,
  "admissionFee": 1000.00,
  "durationMonths": 12,
  "status": "ACTIVE"
}
```

Validation: `courseCode` required (≤ 50), `courseName` required, `courseType` ≤ 50,
fees `>= 0.0`, `durationMonths` positive, `status` required.

**Create Class** — `POST /classes`

```json
{
  "courseId": "00000000-0000-0000-0c01-000000000001",
  "teacherId": "00000000-0000-0000-0002-000000000001",
  "className": "Painting - Batch A",
  "roomNumber": "R-101",
  "roomId": "00000000-0000-0000-0f01-000000000001",
  "roomName": "Studio 1",
  "capacity": 20,
  "startDate": "2025-06-01",
  "endDate": "2026-05-31",
  "status": "ACTIVE"
}
```

Validation: `courseId` required, `className` required, `capacity` positive, `status`
required.

**Enroll Student** — `POST /enrollments`

```json
{
  "studentId": "00000000-0000-0000-0003-000000000001",
  "courseId": "00000000-0000-0000-0c01-000000000001",
  "classId": "00000000-0000-0000-0d01-000000000001",
  "enrollmentDate": "2025-06-01"
}
```

Validation: `studentId`, `courseId`, `classId` required; `enrollmentDate` optional
(defaults to today when omitted). Status is always set to `ACTIVE` by the service.

**Change Status** — `PUT /enrollments/{id}/status`

```json
{ "status": "COMPLETED" }
```

`status` required; value is normalized (trimmed / upper-cased) and must be one of
`ACTIVE`, `COMPLETED`, `DROPPED`, `SUSPENDED`, `CANCELLED`.

## 7. Service Logic

### 7.1 Class capacity check (enroll)

On `enrollStudent`, the service loads the target `CourseClass` (404 if missing), counts
current `ACTIVE` enrollments for that class
(`countByClassIdAndStatus(classId, "ACTIVE")`), and rejects with **400 Bad Request** when
`enrolledCount >= courseClass.capacity`. Only `ACTIVE` rows count toward the seat limit,
so cancelled/dropped seats free up capacity.

Capacity is also guarded around the class lifecycle: `createClass`/`updateClass` reject a
null or non-positive capacity (400); `updateClass` rejects a new capacity below the current
active enrollment count (400); and `deleteClass` is refused with **409 Conflict** while any
active enrollment still references the class.

### 7.2 Duplicate-active prevention

Before inserting, `enrollStudent` checks
`existsByStudentIdAndCourseIdAndStatus(studentId, courseId, "ACTIVE")` and throws
**409 Conflict** if the student already has an `ACTIVE` enrollment in that course. The DB
additionally enforces `UNIQUE(STUDENT_ID, COURSE_ID)`, so a student cannot hold two rows
for the same course at all.

### 7.3 Soft-cancel (DELETE)

`DELETE /enrollments/{id}` does **not** hard-delete. `cancelEnrollment` loads the row (404
if missing), rejects if already `CANCELLED` (409), then flips `STATUS` to `CANCELLED`,
saves, and publishes `enrollment-cancelled`. The row is retained for audit and reporting.

### 7.4 Status transitions

`updateStatus` normalizes the incoming value (trim + upper-case) and validates it against
the allowed set before persisting. Any allowed value may be set directly; there is no
state-machine restriction on which transitions are permitted (400 only for an
unknown/blank status). Note that this endpoint does **not** emit a Kafka event — only
enroll (`enrollment-created`) and cancel (`enrollment-cancelled`) do.

### 7.5 Course uniqueness

`createCourse` rejects a duplicate `courseCode` (409); `updateCourse` rejects a code change
that collides with another existing course (409). `deleteCourse` is a hard delete.

## 8. Kafka Events Published

Producer config: JSON value serializer (no type headers), `acks=all`, idempotent,
`retries=3`. Message key = enrollment id (as String). Topic constants live in
`common-library` → `com.artacademy.common.events.KafkaTopics`.

| Topic (constant)                                | Event class                | When                                  | Payload fields                                        |
|-------------------------------------------------|----------------------------|---------------------------------------|-------------------------------------------------------|
| `enrollment-created` (`ENROLLMENT_CREATED`)     | `EnrollmentCreatedEvent`   | after a student is enrolled           | enrollmentId, studentId, courseId, classId, occurredAt |
| `enrollment-cancelled` (`ENROLLMENT_CANCELLED`) | `EnrollmentCancelledEvent` | after an enrollment is soft-cancelled | enrollmentId, studentId, courseId, occurredAt         |

**Consumers (downstream):** `payment-service` maintains an `ENROLLMENT_CACHE` from these
events (to know who owes fees) and `reporting-service` aggregates enrollment metrics.

Example `enrollment-created` payload:

```json
{
  "enrollmentId": "…",
  "studentId": "…",
  "courseId": "…",
  "classId": "…",
  "occurredAt": "2025-06-01T09:00:00Z"
}
```

## 9. Migrations

Clean-slate Flyway layout (no incremental patch files):

| File | Location | Applies when | Contents |
|------|----------|--------------|----------|
| `V1__init_academic_schema.sql` | `classpath:db/migration` | always | Creates `COURSES`, `CLASSES`, `ENROLLMENTS` + FKs, unique constraint and indexes |
| `V2__seed_dev_data.sql`        | `classpath:db/seed`     | `docker` profile only | Idempotent dev seed data |

The default profile uses `flyway.locations: classpath:db/migration`; the `docker` profile
appends `classpath:db/seed`, so seed data is only inserted in docker/dev environments.
Hibernate runs with `ddl-auto: validate`, so Flyway is the single source of truth for
schema.

**Seed data (`V2`), all idempotent via `ON CONFLICT`:**

- **Courses:** `PAINT-101` "Painting" (₹2500/mo, ₹1000 admission, 12 mo) and
  `SCULP-101` "Sculpture" (₹3000/mo, ₹1500 admission, 12 mo) — both `ACTIVE`, type `ART`.
- **Classes:** "Painting - Batch A" (Studio 1 / R-101, teacher1, capacity 20) and
  "Sculpture - Batch A" (Studio 2 / R-102, teacher2, capacity 15) — both `ACTIVE`,
  2025-06-01 → 2026-05-31.
- **Enrollments (5, all `ACTIVE`):** student1 → Painting *and* Sculpture,
  student2 → Painting, student3 → Sculpture, student4 → Painting.
