# User Service — Detail Design Document

## 1. Overview

The `user-service` manages the master data for the two human actor types in the academy: **Students** and **Teachers**. It stores demographic and contact information, tracks teacher availability slots, and publishes domain events when new users are created so downstream services (reporting, notification) can react asynchronously.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `user-service` |
| Package root | `com.artacademy.userservice` |
| Server port | **8082** local/dev · **8082** Docker container (host-mapped `8082:8082`) |
| Database | `user_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

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
│   └── TeacherController.java
├── domain
│   ├── User.java
│   ├── Student.java
│   ├── Teacher.java
│   └── TeacherAvailability.java
├── dto
│   ├── StudentRequest.java
│   ├── StudentResponse.java
│   ├── TeacherRequest.java
│   ├── TeacherResponse.java
│   ├── TeacherAvailabilityRequest.java
│   └── TeacherAvailabilityResponse.java
├── mapper
│   ├── StudentMapper.java      (MapStruct)
│   └── TeacherMapper.java      (MapStruct)
├── repository
│   ├── StudentRepository.java
│   ├── TeacherRepository.java
│   └── TeacherAvailabilityRepository.java
└── service
    ├── StudentService.java
    └── TeacherService.java
```

---

## 4. Domain Model

### 4.1 Inheritance Strategy

`JOINED` table inheritance: a single `USERS` base table holds common fields; `STUDENTS` and `TEACHERS` hold subtype-specific columns and join to `USERS` on `id`.

```
@Entity @Inheritance(JOINED) @DiscriminatorColumn("USER_TYPE")
User (base)
├── @DiscriminatorValue("STUDENT")  Student
└── @DiscriminatorValue("TEACHER")  Teacher
```

### 4.2 `User` (base entity)

```
UUID     id           (PK)
String   loginId      (nullable — links to auth-service User)
String   firstName    (not null)
String   lastName
```

### 4.3 `Student`

Inherits `User`, adds:

```
LocalDate  dob
String     fatherName
String     fatherPhone
String     motherName
String     motherPhone
String     guardianName
String     guardianPhone
String     email
String     address
LocalDate  enrollmentDate
String     status          (ACTIVE | INACTIVE)
```

### 4.4 `Teacher`

Inherits `User`, adds:

```
String     employeeCode   (unique, max 50)
String     email
String     phone
String     qualification
LocalDate  joiningDate    (not null)
String     status         (ACTIVE | INACTIVE)
```

### 4.5 `TeacherAvailability`

```
UUID        id
Teacher     teacher    (ManyToOne LAZY)
DayOfWeek   dayOfWeek  (Java enum: MONDAY…SUNDAY)
LocalTime   startTime
LocalTime   endTime
```

---

## 5. Database Schema

Final state after V2 migration:

```sql
CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type  VARCHAR(20) NOT NULL,   -- discriminator
    login_id   VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100)
);

CREATE TABLE students (
    id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dob             DATE,
    father_name     VARCHAR(100),
    father_phone    VARCHAR(20),
    mother_name     VARCHAR(100),
    mother_phone    VARCHAR(20),
    guardian_name   VARCHAR(100),
    guardian_phone  VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    enrollment_date DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE teachers (
    id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_code  VARCHAR(50) UNIQUE NOT NULL,
    email          VARCHAR(255),
    phone          VARCHAR(20),
    qualification  VARCHAR(255),
    joining_date   DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE teacher_availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL
);
```

---

## 6. REST API

### 6.1 Student Endpoints

Base path: `/students`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/students/me` | Any authenticated | Get own profile by `loginId` from JWT |
| `GET` | `/students` | PRINCIPAL | List all students (paginated) |
| `GET` | `/students/{id}` | PRINCIPAL | Get student by UUID |
| `POST` | `/students` | PRINCIPAL | Create student |
| `PUT` | `/students/{id}` | PRINCIPAL | Update student |
| `DELETE` | `/students/{id}` | PRINCIPAL | Delete student |

**Pagination defaults:** `page=0, size=20`

#### `POST /students` — Request Body

```json
{
  "loginId": "S001",
  "firstName": "Aarav",
  "lastName": "Shah",
  "dob": "2010-05-12",
  "fatherName": "Raj Shah",
  "fatherPhone": "9876543210",
  "motherName": "Priya Shah",
  "motherPhone": "9876500000",
  "email": "aarav@example.com",
  "address": "123 Main St, Surat",
  "enrollmentDate": "2024-06-01",
  "status": "ACTIVE"
}
```

**Validation:**
- `firstName` — `@NotBlank`
- `email` — `@Email`
- `status` — `@NotBlank`

#### `StudentResponse`

```json
{
  "id": "<UUID>",
  "loginId": "S001",
  "firstName": "Aarav",
  "lastName": "Shah",
  ...all StudentRequest fields
}
```

---

### 6.2 Teacher Endpoints

Base path: `/teachers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/teachers` | PRINCIPAL | List all teachers (paginated) |
| `GET` | `/teachers/{id}` | PRINCIPAL | Get teacher by UUID |
| `GET` | `/teachers/{id}/availability` | PRINCIPAL | Get availability slots |
| `POST` | `/teachers` | PRINCIPAL | Create teacher |
| `PUT` | `/teachers/{id}` | PRINCIPAL | Update teacher |
| `PUT` | `/teachers/{id}/availability` | PRINCIPAL | Replace availability slots (full replace) |
| `DELETE` | `/teachers/{id}` | PRINCIPAL | Delete teacher |

#### `POST /teachers` — Request Body

```json
{
  "loginId": "T001",
  "firstName": "Meena",
  "lastName": "Patel",
  "employeeCode": "EMP001",
  "email": "meena@academy.com",
  "phone": "9988776655",
  "qualification": "B.F.A.",
  "joiningDate": "2022-01-10",
  "status": "ACTIVE"
}
```

**Validation:**
- `firstName` — `@NotBlank`
- `employeeCode` — `@NotBlank`, max 50
- `email` — `@Email`
- `joiningDate` — `@NotNull`
- `status` — `@NotBlank`

#### `PUT /teachers/{id}/availability` — Request Body

Full replacement of all existing slots:

```json
[
  { "dayOfWeek": "MONDAY",    "startTime": "09:00", "endTime": "13:00" },
  { "dayOfWeek": "WEDNESDAY", "startTime": "14:00", "endTime": "18:00" }
]
```

---

## 7. Service Logic

### `StudentService`

| Method | Logic |
|--------|-------|
| `getAllStudents(Pageable)` | Paginated `findAll` |
| `getStudentByLoginId(loginId)` | Find or throw `404` |
| `getStudentById(id)` | Find or throw `404` |
| `createStudent(request)` | Check `existsByLoginId` → throw `409` if duplicate; save; publish `StudentCreatedEvent` |
| `updateStudent(id, request)` | Load; check loginId conflict (exclude self); save |
| `deleteStudent(id)` | Load; delete |

### `TeacherService`

| Method | Logic |
|--------|-------|
| `getAllTeachers(Pageable)` | Paginated `findAll` |
| `getTeacherById(id)` | Find or throw `404` |
| `createTeacher(request)` | Check `existsByEmployeeCode` → throw `409`; save; publish `TeacherCreatedEvent` |
| `updateTeacher(id, request)` | Load; employeeCode conflict check (exclude self); save |
| `deleteTeacher(id)` | Delete all availability slots first, then delete teacher |
| `getAvailability(teacherId)` | Load teacher; return `availabilities` list |
| `updateAvailability(teacherId, requests)` | Delete all existing slots; save new list |

---

## 8. Kafka Events Published

| Topic | Event | When |
|-------|-------|------|
| `student.created` | `StudentCreatedEvent` | After student persist |
| `teacher.created` | `TeacherCreatedEvent` | After teacher persist |

Consumers: `reporting-service` (creates summary rows).

---

## 9. MapStruct Mappers

`StudentMapper` and `TeacherMapper` are interface-based MapStruct mappers. Implementations are generated at compile time in `target/generated-sources/annotations/`.

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGSERIAL IDs and separate teacher/student tables |
| V2 | Redesign: JOINED inheritance with UUID PKs; `USERS` base table + `STUDENTS`, `TEACHERS`, `TEACHER_AVAILABILITY` with UUID FKs |
