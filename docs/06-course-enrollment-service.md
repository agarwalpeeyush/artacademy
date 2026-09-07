# Course Enrollment Service — Detail Design Document

## 1. Overview

The `course-enrollment-service` manages the academy's course catalogue, the scheduled class offerings (CourseClass), and student enrollment in those classes. It is the source of truth for what is being taught, by whom, and who is enrolled. It publishes enrollment events that drive fee generation and reporting.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `course-enrollment-service` |
| Package root | `com.artacademy.courseenrollment` |
| Server port | **8083** (registered in Eureka as `COURSE-ENROLLMENT-SERVICE`) |
| Database | `artacademy_courses` (PostgreSQL) |

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
│   ├── CourseRequest.java
│   ├── CourseResponse.java
│   ├── ClassRequest.java
│   ├── ClassResponse.java
│   ├── EnrollmentRequest.java
│   └── EnrollmentResponse.java
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

### 4.1 `Course`

```
UUID        id
String      courseCode     (unique, not null)
String      courseName     (not null)
String      courseType     (e.g. "DRAWING", "PAINTING", "DANCE")
String      description
BigDecimal  monthlyFee
BigDecimal  admissionFee
Integer     durationMonths
String      status         (ACTIVE | INACTIVE)
```

### 4.2 `CourseClass`

Represents a specific scheduled offering of a course:

```
UUID    id
UUID    courseId         (FK → courses)
UUID    teacherId        (FK → user-service, not enforced at DB level)
String  className        (e.g. "Drawing Batch A - Morning")
String  roomNumber
Integer maxCapacity
String  status           (ACTIVE | INACTIVE)
```

### 4.3 `Enrollment`

```
UUID        id
UUID        studentId      (FK → user-service, not enforced at DB level)
UUID        courseId
UUID        classId
LocalDate   enrollmentDate
String      status         (ACTIVE | CANCELLED)

UNIQUE (studentId, courseId)   -- prevents double-enrollment in same course
```

---

## 5. Database Schema

Final state after V2 migration:

```sql
CREATE TABLE courses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code      VARCHAR(50)  UNIQUE NOT NULL,
    course_name      VARCHAR(200) NOT NULL,
    course_type      VARCHAR(100),
    description      TEXT,
    monthly_fee      NUMERIC(10,2),
    admission_fee    NUMERIC(10,2),
    duration_months  INTEGER,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE course_classes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id     UUID NOT NULL REFERENCES courses(id),
    teacher_id    UUID,
    class_name    VARCHAR(200) NOT NULL,
    room_number   VARCHAR(50),
    max_capacity  INTEGER,
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE enrollments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL,
    course_id        UUID NOT NULL,
    class_id         UUID NOT NULL,
    enrollment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    UNIQUE (student_id, course_id)
);
```

---

## 6. REST API

### 6.1 Course Endpoints

Base path: `/courses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses` | Any | List all courses (optional `?type=PAINTING` filter) |
| `GET` | `/courses/{id}` | Any | Get course by UUID |
| `POST` | `/courses` | PRINCIPAL | Create course |
| `PUT` | `/courses/{id}` | PRINCIPAL | Update course |
| `DELETE` | `/courses/{id}` | PRINCIPAL | Delete course |

#### `POST /courses` — Request Body

```json
{
  "courseCode": "DRAW-101",
  "courseName": "Basic Drawing",
  "courseType": "DRAWING",
  "description": "Fundamentals of pencil and charcoal drawing.",
  "monthlyFee": 1500.00,
  "admissionFee": 500.00,
  "durationMonths": 12,
  "status": "ACTIVE"
}
```

---

### 6.2 Class Endpoints

Base path: `/classes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/classes` | Any | List all classes |
| `GET` | `/classes/{id}` | Any | Get class by UUID |
| `POST` | `/classes` | PRINCIPAL | Create class |
| `PUT` | `/classes/{id}` | PRINCIPAL | Update class |
| `DELETE` | `/classes/{id}` | PRINCIPAL | Delete class |

#### `POST /classes` — Request Body

```json
{
  "courseId": "<UUID>",
  "teacherId": "<UUID>",
  "className": "Drawing Batch A - Morning",
  "roomNumber": "R01",
  "maxCapacity": 20,
  "status": "ACTIVE"
}
```

**Business rule:** `DELETE /classes/{id}` is rejected if active enrollments exist in that class.

---

### 6.3 Enrollment Endpoints

Base path: `/enrollments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/enrollments` | PRINCIPAL | Enroll student in a class |
| `GET` | `/enrollments/student/{studentId}` | PRINCIPAL, TEACHER, STUDENT | Get enrollments for a student |
| `DELETE` | `/enrollments/{id}` | PRINCIPAL | Cancel enrollment |

#### `POST /enrollments` — Request Body

```json
{
  "studentId": "<UUID>",
  "courseId": "<UUID>",
  "classId": "<UUID>",
  "enrollmentDate": "2024-09-01",
  "status": "ACTIVE"
}
```

**Business rules:**
- Reject if an active enrollment already exists for `(studentId, courseId)` → `409 Conflict`.
- Check class capacity: count active enrollments for `classId` < `maxCapacity`.

#### `DELETE /enrollments/{id}` — Cancel

Sets `status = CANCELLED`. Does not delete the row (preserves history).

---

## 7. Service Logic

### `CourseService`

| Method | Logic |
|--------|-------|
| `getAllCourses(type)` | If `type` provided: filter by `courseType`; else return all |
| `getCourseById(id)` | Find or throw `404` |
| `createCourse(request)` | Check `existsByCourseCode` → throw `409`; save |
| `updateCourse(id, request)` | Load; check courseCode conflict (exclude self); save |
| `deleteCourse(id)` | Load; delete |

### `ClassService`

| Method | Logic |
|--------|-------|
| `createClass(request)` | Verify `courseId` exists; save |
| `deleteClass(id)` | Count active enrollments; throw `400` if > 0 |

### `EnrollmentService`

| Method | Logic |
|--------|-------|
| `enroll(request)` | Check duplicate `(studentId, courseId)` active → `409`; check capacity; save; publish `EnrollmentCreatedEvent` |
| `cancelEnrollment(id)` | Load; set `status = CANCELLED`; save; publish `EnrollmentCancelledEvent` |
| `getByStudentId(studentId)` | Return all enrollments for student |

---

## 8. Kafka Events Published

| Topic | Event | When |
|-------|-------|------|
| `enrollment.created` | `EnrollmentCreatedEvent` | After enrollment persist |
| `enrollment.cancelled` | `EnrollmentCancelledEvent` | After status set to CANCELLED |

**Consumers:**
- `payment-service` — maintains `EnrollmentCache` for fee generation
- `reporting-service` — increments/decrements `StudentReport.totalEnrollments`

---

## 9. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGSERIAL IDs |
| V2 | Migrated to UUID primary keys; maintained unique and FK constraints |
