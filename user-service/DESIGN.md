# User Service — Detail Design Document

## 1. Overview

The `user-service` manages the master data for the three human actor profiles in the academy:
**Students**, **Teachers**, and **Parents**. It stores demographic and contact information,
tracks teacher weekly availability and one-off availability exceptions (leave/sick days), links
parents to their children, and publishes domain events when new users are created so downstream
services (auth, reporting, notification) can react asynchronously.

Identity is shared across the platform: the UUID minted here for a person is reused verbatim by
auth-service (via a `*.created` Kafka event) and appears as `STUDENT_ID` / `TEACHER_ID` in the
academic, attendance, schedule, and payment databases.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `user-service` |
| Package root | `com.artacademy.userservice` |
| Server port | **8082** local/dev · **8082** Docker container (host-mapped `8082:8082`) |
| Database | `user_db` (PostgreSQL) |

---

## 3. Component Structure

```
com.artacademy.userservice
├── UserServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   └── KafkaProducerConfig.java
├── controller
│   ├── StudentController.java
│   ├── TeacherController.java
│   └── ParentController.java
├── domain
│   ├── User.java
│   ├── Student.java
│   ├── Teacher.java
│   ├── Parent.java
│   ├── TeacherAvailability.java
│   └── TeacherAvailabilityException.java
├── dto
│   ├── StudentRequest.java / StudentResponse.java
│   ├── TeacherRequest.java / TeacherResponse.java
│   ├── ParentRequest.java / ParentResponse.java
│   ├── TeacherAvailabilityRequest.java / TeacherAvailabilityResponse.java
│   └── TeacherAvailabilityExceptionRequest.java / TeacherAvailabilityExceptionResponse.java
├── mapper
│   ├── StudentMapper.java   (MapStruct)
│   ├── TeacherMapper.java   (MapStruct)
│   └── ParentMapper.java    (MapStruct)
├── repository
│   ├── StudentRepository.java
│   ├── TeacherRepository.java
│   ├── ParentRepository.java
│   ├── TeacherAvailabilityRepository.java
│   └── TeacherAvailabilityExceptionRepository.java
└── service
    ├── StudentService.java
    ├── TeacherService.java
    └── ParentService.java
```

---

## 4. Domain Model

### 4.1 Inheritance Strategy

`JOINED` table inheritance: a single `USERS` base table holds common fields; `STUDENTS`,
`TEACHERS`, and `PARENTS` hold subtype-specific columns and join to `USERS` on `id`.

```
@Entity @Inheritance(JOINED) @DiscriminatorColumn("USER_TYPE")
User (base)
├── @DiscriminatorValue("STUDENT")  Student
├── @DiscriminatorValue("TEACHER")  Teacher
└── @DiscriminatorValue("PARENT")   Parent
```

### 4.2 `User` (base entity)

```
UUID     id           (PK)
String   loginId      (nullable — links to auth-service username)
String   firstName    (not null)
String   lastName
```

### 4.3 `Student`

Inherits `User`, adds `dob`, `fatherName`/`fatherPhone`, `motherName`/`motherPhone`,
`guardianName`/`guardianPhone`, `email`, `address`, `enrollmentDate`, `status` (ACTIVE | INACTIVE).

### 4.4 `Teacher`

Inherits `User`, adds `employeeCode` (unique, max 50), `email`, `phone`, `qualification`,
`joiningDate` (not null), `status` (ACTIVE | INACTIVE).

### 4.5 `Parent`

Inherits `User`, adds:

```
String  relationship
String  phone
String  email
String  address
String  occupation
UUID    studentId     (FK → STUDENTS.ID — the linked child)
String  status        (not null)
```

### 4.6 `TeacherAvailability` (recurring weekly slots)

```
UUID        id
Teacher     teacher    (ManyToOne LAZY)
DayOfWeek   dayOfWeek  (Java enum: MONDAY…SUNDAY)
LocalTime   startTime
LocalTime   endTime
```

### 4.7 `TeacherAvailabilityException` (one-off leave/sick days)

```
UUID       id
Teacher    teacher            (ManyToOne LAZY, not null)
LocalDate  date               (EXCEPTION_DATE, not null)
String     reason             (max 255; e.g. LEAVE / SICK + note)
boolean    unavailableAllDay  (not null, default true)
LocalTime  startTime          (nullable — set for partial-day)
LocalTime  endTime            (nullable — set for partial-day)
```

---

## 5. Database Schema

Final state after V4 migration (V5 seeds sample rows):

```sql
CREATE TABLE USERS (
    ID         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_TYPE  VARCHAR(20) NOT NULL,   -- discriminator
    LOGIN_ID   VARCHAR(100),
    FIRST_NAME VARCHAR(100) NOT NULL,
    LAST_NAME  VARCHAR(100)
);

CREATE TABLE STUDENTS (
    ID              UUID PRIMARY KEY REFERENCES USERS(ID) ON DELETE CASCADE,
    DOB             DATE,
    FATHER_NAME     VARCHAR(100),
    FATHER_PHONE    VARCHAR(20),
    MOTHER_NAME     VARCHAR(100),
    MOTHER_PHONE    VARCHAR(20),
    GUARDIAN_NAME   VARCHAR(100),
    GUARDIAN_PHONE  VARCHAR(20),
    EMAIL           VARCHAR(255),
    ADDRESS         TEXT,
    ENROLLMENT_DATE DATE,
    STATUS          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE TEACHERS (
    ID             UUID PRIMARY KEY REFERENCES USERS(ID) ON DELETE CASCADE,
    EMPLOYEE_CODE  VARCHAR(50) UNIQUE NOT NULL,
    EMAIL          VARCHAR(255),
    PHONE          VARCHAR(20),
    QUALIFICATION  VARCHAR(255),
    JOINING_DATE   DATE NOT NULL,
    STATUS         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE PARENTS (
    ID           UUID PRIMARY KEY REFERENCES USERS(ID) ON DELETE CASCADE,
    RELATIONSHIP VARCHAR(50),
    PHONE        VARCHAR(50),
    EMAIL        VARCHAR(255),
    ADDRESS      TEXT,
    OCCUPATION   VARCHAR(255),
    STUDENT_ID   UUID REFERENCES STUDENTS(ID),
    STATUS       VARCHAR(50) NOT NULL
);
CREATE INDEX idx_parents_student_id ON PARENTS(STUDENT_ID);

CREATE TABLE TEACHER_AVAILABILITY (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID  UUID NOT NULL REFERENCES TEACHERS(ID) ON DELETE CASCADE,
    DAY_OF_WEEK VARCHAR(10) NOT NULL,
    START_TIME  TIME NOT NULL,
    END_TIME    TIME NOT NULL
);

CREATE TABLE TEACHER_AVAILABILITY_EXCEPTIONS (
    ID                  UUID PRIMARY KEY,
    TEACHER_ID          UUID NOT NULL REFERENCES TEACHERS(ID) ON DELETE CASCADE,
    EXCEPTION_DATE      DATE NOT NULL,
    REASON              VARCHAR(255),
    UNAVAILABLE_ALL_DAY BOOLEAN NOT NULL DEFAULT TRUE,
    START_TIME          TIME,
    END_TIME            TIME
);
CREATE INDEX idx_availability_exceptions_teacher_id ON TEACHER_AVAILABILITY_EXCEPTIONS(TEACHER_ID);
```

`ddl-auto: validate` — the schema must match the JPA entities exactly.

---

## 6. REST API

### 6.1 Student Endpoints — `/students`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/students/me` | Any authenticated | Own profile resolved by `loginId` (JWT `Authentication.getName()`) |
| `GET` | `/students` | PRINCIPAL | List all students (paginated, `size=20`) |
| `GET` | `/students/{id}` | PRINCIPAL | Get student by UUID |
| `POST` | `/students` | PRINCIPAL | Create student |
| `PUT` | `/students/{id}` | PRINCIPAL | Update student (also used for student self-profile edit) |
| `DELETE` | `/students/{id}` | PRINCIPAL | Delete student |

### 6.2 Teacher Endpoints — `/teachers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/teachers` | PRINCIPAL | List all teachers (paginated) |
| `GET` | `/teachers/{id}` | PRINCIPAL | Get teacher by UUID |
| `POST` | `/teachers` | PRINCIPAL | Create teacher |
| `PUT` | `/teachers/{id}` | PRINCIPAL | Update teacher |
| `DELETE` | `/teachers/{id}` | PRINCIPAL | Delete teacher |
| `GET` | `/teachers/{id}/availability` | — | Get recurring weekly availability slots |
| `PUT` | `/teachers/{id}/availability` | — | Replace all availability slots (full replace) |
| `GET` | `/teachers/{id}/availability-exceptions` | — | List one-off exceptions |
| `POST` | `/teachers/{id}/availability-exceptions` | — | Add a one-off exception (leave/sick) |
| `DELETE` | `/teachers/{id}/availability-exceptions/{exceptionId}` | — | Delete an exception |

#### `POST /teachers/{id}/availability-exceptions` — Request Body

```json
{
  "date": "2026-09-20",
  "reason": "SICK",
  "unavailableAllDay": true,
  "startTime": null,
  "endTime": null
}
```

For a partial-day exception, set `unavailableAllDay: false` and provide `startTime`/`endTime`.

### 6.3 Parent Endpoints — `/parents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/parents/me` | Any authenticated | Authenticated parent's own profile (by `loginId`) |
| `GET` | `/parents/me/children` | Any authenticated | Children linked to the authenticated parent |
| `GET` | `/parents` | PRINCIPAL | List all parents (paginated) |
| `GET` | `/parents/{id}` | PRINCIPAL | Get parent by UUID |
| `POST` | `/parents` | PRINCIPAL | Create parent (links to a `studentId`) |
| `PUT` | `/parents/{id}` | PRINCIPAL | Update parent |
| `DELETE` | `/parents/{id}` | PRINCIPAL | Delete parent |

All responses use the shared `ApiResponse.success(...)` envelope.

---

## 7. Service Logic

### `StudentService`

| Method | Logic |
|--------|-------|
| `getAllStudents(Pageable)` | Paginated `findAll` |
| `getStudentByLoginId(loginId)` | Find or throw `404` (used by `/students/me`) |
| `getStudentById(id)` | Find or throw `404` |
| `createStudent(request)` | `existsByLoginId` → `409` if duplicate; save; publish `StudentCreatedEvent` |
| `updateStudent(id, request)` | Load; loginId conflict check (exclude self); save |
| `deleteStudent(id)` | Load; delete |

### `TeacherService`

| Method | Logic |
|--------|-------|
| `getAllTeachers(Pageable)` | Paginated `findAll` |
| `getTeacherById(id)` | Find or throw `404` |
| `createTeacher(request)` | `existsByEmployeeCode` → `409`; save; publish `TeacherCreatedEvent` |
| `updateTeacher(id, request)` | Load; employeeCode conflict check (exclude self); save |
| `deleteTeacher(id)` | Delete availability slots first, then teacher |
| `getAvailability(id)` / `updateAvailability(id, list)` | Read / full-replace weekly slots |
| `getExceptions(id)` | List exceptions ordered by date |
| `addException(id, request)` | Load teacher; persist a new exception |
| `deleteException(id, exceptionId)` | Delete the exception scoped to the teacher |

### `ParentService`

| Method | Logic |
|--------|-------|
| `getAllParents(Pageable)` | Paginated `findAll` |
| `getParentByLoginId(loginId)` | Authenticated parent lookup for `/parents/me` |
| `getMyChildren(loginId)` | Resolve the parent, return the linked child/children |
| `getParentById(id)` | Find or throw `404` |
| `createParent(request)` | Save with linked `studentId`; publish `ParentCreatedEvent` |
| `updateParent(id, request)` / `deleteParent(id)` | Standard update / delete |

---

## 8. Kafka Events Published

| Topic | Event | When |
|-------|-------|------|
| `student.created` | `StudentCreatedEvent` | After student persist |
| `teacher.created` | `TeacherCreatedEvent` | After teacher persist |
| `parent.created` | `ParentCreatedEvent` | After parent persist |

Consumers: `auth-service` (creates a matching auth user with the **same** UUID + role) and
`reporting-service` (creates summary rows).

---

## 9. MapStruct Mappers

`StudentMapper`, `TeacherMapper`, and `ParentMapper` are interface-based MapStruct mappers;
implementations are generated at compile time under `target/generated-sources/annotations/`.

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGSERIAL IDs and separate teacher/student tables |
| V2 | Redesign: JOINED inheritance with UUID PKs; `USERS` base + `STUDENTS`, `TEACHERS`, `TEACHER_AVAILABILITY` |
| V3 | Added `PARENTS` child table (parent → student link) |
| V4 | Added `TEACHER_AVAILABILITY_EXCEPTIONS` (one-off leave/sick days, all-day or partial) |
| V5 | Seed sample users: principal, 2 teachers (+ weekly availability), 3 students, 1 parent linked to student1 — UUIDs match auth/academic/attendance/schedule/payment seeds |
