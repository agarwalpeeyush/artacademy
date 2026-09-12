# User Service — Detail Design Document

## 1. Overview

The **User Service** owns the master data for every human actor in the Art Academy
platform: **students**, **teachers**, and **parents**. It is the system of record
for profiles (names, contact details, qualifications, parent/occupation information),
teacher **weekly availability** and one-off **availability exceptions**, and the
parent-to-student links (a many-to-many relation via the `PARENT_STUDENTS` join table).

The service is deliberately separated from the **auth-service**, which owns login
credentials and roles. When a profile is created here, the User Service **publishes
a `*-created` Kafka event** carrying the new person's UUID plus a temporary password
and role list; the auth-service consumes it and provisions a login **with the same
UUID**. This shared-UUID convention lets a person be joined across `user_db`,
`auth_db`, and every downstream service database.

Key characteristics:

- **JOINED inheritance** — one `USERS` base table with a `USER_TYPE` discriminator,
  and per-type child tables (`STUDENTS`, `TEACHERS`, `PARENTS`) keyed by the same ID.
- **Kafka producer only** — no consumers live in this service.
- Stateless JWT security; role-based authorization enforced centrally in
  `SecurityConfig`.

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| Service name | `user-service` |
| HTTP port | `8082` |
| Database | `user_db` (PostgreSQL) |
| Package root | `com.artacademy.userservice` |
| Framework | Spring Boot 3.3.4, Java 21 |
| Persistence | Spring Data JPA / Hibernate, `ddl-auto: validate` |
| Migrations | Flyway (`classpath:db/migration`; `db/seed` added under `docker` profile) |
| Messaging | Spring Kafka (producer) |
| Config source | Config Server at `http://localhost:8888` |
| Service discovery | Eureka (`@EnableDiscoveryClient`) |
| API docs | springdoc OpenAPI / Swagger UI |

Datasource (from `config-server/config/user-service.yml`):
`jdbc:postgresql://localhost:15432/user_db`.

## 3. Component Structure

Package tree (actual files under `src/main/java/com/artacademy/userservice`):

```
com.artacademy.userservice
├── UserServiceApplication.java          # @SpringBootApplication, @EnableDiscoveryClient
├── config
│   ├── KafkaProducerConfig.java         # ProducerFactory + KafkaTemplate (JSON, idempotent)
│   └── SecurityConfig.java              # JWT filter chain + role rules
├── controller
│   ├── StudentController.java           # /students
│   ├── TeacherController.java           # /teachers (+ availability, exceptions)
│   ├── ParentController.java            # /parents (+ /me/children)
│   └── UserController.java              # /users/login-id/available
├── domain
│   ├── User.java                        # @Entity USERS, JOINED, @DiscriminatorColumn USER_TYPE
│   ├── Student.java                     # @DiscriminatorValue("STUDENT")
│   ├── Teacher.java                     # @DiscriminatorValue("TEACHER")
│   ├── Parent.java                      # @DiscriminatorValue("PARENT")
│   ├── TeacherAvailability.java         # TEACHER_AVAILABILITY
│   └── TeacherAvailabilityException.java# TEACHER_AVAILABILITY_EXCEPTIONS
├── dto
│   ├── StudentRequest.java / StudentResponse.java / StudentSelfUpdateRequest.java
│   ├── TeacherRequest.java / TeacherResponse.java / TeacherSelfUpdateRequest.java
│   ├── TeacherAvailabilityRequest.java / TeacherAvailabilityResponse.java
│   ├── TeacherAvailabilityExceptionRequest.java / TeacherAvailabilityExceptionResponse.java
│   └── ParentRequest.java / ParentResponse.java / ParentSelfUpdateRequest.java
├── mapper
│   ├── StudentMapper.java               # MapStruct
│   ├── TeacherMapper.java               # MapStruct
│   └── ParentMapper.java                # MapStruct
├── repository
│   ├── UserRepository.java
│   ├── StudentRepository.java
│   ├── TeacherRepository.java
│   ├── ParentRepository.java
│   ├── TeacherAvailabilityRepository.java
│   └── TeacherAvailabilityExceptionRepository.java
└── service
    ├── StudentService.java
    ├── TeacherService.java
    ├── ParentService.java
    └── UserAccountService.java          # login-id availability
```

## 4. Domain Model

### JOINED inheritance + discriminator

`User` is an `@Entity` mapped to table `USERS` with
`@Inheritance(strategy = InheritanceType.JOINED)` and
`@DiscriminatorColumn(name = "USER_TYPE", discriminatorType = STRING)`.

Each subtype (`Student`, `Teacher`, `Parent`) is an `@Entity` that `extends User`,
annotated with `@DiscriminatorValue(...)` and `@PrimaryKeyJoinColumn(name = "ID")`.
Under the JOINED strategy the subtype's own columns live in its **own child table**
(`STUDENTS`, `TEACHERS`, `PARENTS`), and the child row shares the **same primary key
UUID** as its `USERS` row (a FK back to `USERS.ID`, cascade delete). Hibernate writes
the concrete class name (`STUDENT` / `TEACHER` / `PARENT`) into `USERS.USER_TYPE`; the
column is not exposed as a mapped field on the `User` entity — JPA manages it.

### `User` (table `USERS`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| `id` | `ID` | UUID | PK, `@GeneratedValue(UUID)` |
| `loginId` | `LOGIN_ID` | String | equals the auth username; uniqueness enforced at the service layer (no DB constraint) |
| `firstName` | `FIRST_NAME` | String | `NOT NULL` |
| `lastName` | `LAST_NAME` | String | nullable |
| `email` | `EMAIL` | String | nullable; not unique |
| `phone` | `PHONE_NUMBER` | String | nullable |

The discriminator `USER_TYPE` is stored in `USERS` but is not a mapped Java field.
**Contact fields (`email`, `phone`) live on the base `User`/`USERS` table and are
shared by all subtypes** — they are no longer duplicated on the child tables.

### `Student` (table `STUDENTS`, discriminator `STUDENT`)

| Field | Column | Type |
|-------|--------|------|
| `dob` | `DATE_OF_BIRTH` | LocalDate |
| `address` | `ADDRESS` | TEXT |
| `enrollmentDate` | `ENROLLMENT_DATE` | LocalDate |
| `status` | `STATUS` | String (`NOT NULL`) |

The old father/mother/guardian name+phone columns and the student-level `EMAIL`
column are **gone**. A student's contact email/phone now come from the base `USERS`
row. `Student` also holds `@ManyToMany(mappedBy = "children") Set<Parent> parents`,
the inverse side of the parent↔student link.

### `Teacher` (table `TEACHERS`, discriminator `TEACHER`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| `employeeCode` | `EMPLOYEE_CODE` | String(50) | unique |
| `qualification` | `QUALIFICATION` | String |
| `joiningDate` | `JOINING_DATE` | LocalDate |
| `status` | `STATUS` | String (`NOT NULL`) |

(`email`/`phone` are inherited from the base `USERS` row.)

### `Parent` (table `PARENTS`, discriminator `PARENT`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| `parentName` | `PARENT_NAME` | String |
| `relationship` | `RELATIONSHIP` | enum (`Relationship` `MOTHER`/`FATHER`, STRING) |
| `address` | `ADDRESS` | TEXT |
| `occupation` | `OCCUPATION` | String |
| `status` | `STATUS` | String (`NOT NULL`) |

There is **no** `STUDENT_ID` or `EMAIL` column on `PARENTS`. Children are modelled
as a `@ManyToMany Set<Student> children` via the `@JoinTable PARENT_STUDENTS`
(`joinColumns = PARENT_ID`, `inverseJoinColumns = STUDENT_ID`). A single parent is
one row keyed by their UUID; the many-to-many join table carries zero or more child
links. A parent's `loginId` (and auth username) **is their phone number**, so
parents are deduped by phone.

### `TeacherAvailability` (table `TEACHER_AVAILABILITY`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| `id` | `ID` | UUID | PK |
| `teacher` | `TEACHER_ID` | UUID | `@ManyToOne` → `Teacher`, `NOT NULL` |
| `dayOfWeek` | `DAY_OF_WEEK` | enum (`DayOfWeek`, STRING) |
| `startTime` | `START_TIME` | LocalTime |
| `endTime` | `END_TIME` | LocalTime |

Represents a **recurring weekly** window.

### `TeacherAvailabilityException` (table `TEACHER_AVAILABILITY_EXCEPTIONS`)

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| `id` | `ID` | UUID | PK |
| `teacher` | `TEACHER_ID` | UUID | `@ManyToOne` → `Teacher`, `NOT NULL` |
| `date` | `EXCEPTION_DATE` | LocalDate | `NOT NULL` |
| `reason` | `REASON` | String(255) |
| `unavailableAllDay` | `UNAVAILABLE_ALL_DAY` | boolean | `NOT NULL` |
| `startTime` | `START_TIME` | LocalTime | null when all-day |
| `endTime` | `END_TIME` | LocalTime | null when all-day |

Represents a **one-off** override (leave / sick day / partial-day unavailability).
Note the Java field is named `date`, mapped to column `EXCEPTION_DATE`.

## 5. Database Schema

Actual `V1__init_user_schema.sql`:

```sql
-- User service schema (user_db). JOINED inheritance: USERS base + STUDENTS/TEACHERS/PARENTS.
-- Uniqueness of LOGIN_ID / EMAIL / PHONE is enforced at the service layer
-- (no DB unique constraint), matching auth_db where a parent's identity is a phone.

CREATE TABLE USERS (
    ID           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_TYPE    VARCHAR(31) NOT NULL,
    LOGIN_ID     VARCHAR(255),
    FIRST_NAME   VARCHAR(255) NOT NULL,
    LAST_NAME    VARCHAR(255),
    EMAIL        VARCHAR(255),
    PHONE_NUMBER VARCHAR(255)
);

CREATE INDEX idx_users_login_id ON USERS (LOGIN_ID);

CREATE TABLE STUDENTS (
    ID              UUID PRIMARY KEY,
    DATE_OF_BIRTH   DATE,
    ADDRESS         TEXT,
    ENROLLMENT_DATE DATE,
    STATUS          VARCHAR(255) NOT NULL,
    CONSTRAINT fk_students_user FOREIGN KEY (ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE TABLE TEACHERS (
    ID            UUID PRIMARY KEY,
    EMPLOYEE_CODE VARCHAR(50) UNIQUE,
    QUALIFICATION VARCHAR(255),
    JOINING_DATE  DATE,
    STATUS        VARCHAR(255) NOT NULL,
    CONSTRAINT fk_teachers_user FOREIGN KEY (ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_teachers_employee_code ON TEACHERS (EMPLOYEE_CODE);

CREATE TABLE PARENTS (
    ID           UUID PRIMARY KEY,
    PARENT_NAME  VARCHAR(255),
    RELATIONSHIP VARCHAR(255),
    ADDRESS      TEXT,
    OCCUPATION   VARCHAR(255),
    STATUS       VARCHAR(255) NOT NULL,
    CONSTRAINT fk_parents_user FOREIGN KEY (ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE TABLE PARENT_STUDENTS (
    PARENT_ID  UUID NOT NULL,
    STUDENT_ID UUID NOT NULL,
    PRIMARY KEY (PARENT_ID, STUDENT_ID),
    CONSTRAINT fk_parent_students_parent  FOREIGN KEY (PARENT_ID)  REFERENCES PARENTS (ID)  ON DELETE CASCADE,
    CONSTRAINT fk_parent_students_student FOREIGN KEY (STUDENT_ID) REFERENCES STUDENTS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_parent_students_student_id ON PARENT_STUDENTS (STUDENT_ID);

CREATE TABLE TEACHER_AVAILABILITY (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID  UUID NOT NULL,
    DAY_OF_WEEK VARCHAR(255),
    START_TIME  TIME,
    END_TIME    TIME,
    CONSTRAINT fk_availability_teacher FOREIGN KEY (TEACHER_ID) REFERENCES TEACHERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_availability_teacher_id ON TEACHER_AVAILABILITY (TEACHER_ID);

CREATE TABLE TEACHER_AVAILABILITY_EXCEPTIONS (
    ID                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TEACHER_ID          UUID NOT NULL,
    EXCEPTION_DATE      DATE NOT NULL,
    REASON              VARCHAR(255),
    UNAVAILABLE_ALL_DAY BOOLEAN NOT NULL,
    START_TIME          TIME,
    END_TIME            TIME,
    CONSTRAINT fk_availability_exceptions_teacher FOREIGN KEY (TEACHER_ID) REFERENCES TEACHERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_availability_exceptions_teacher_id ON TEACHER_AVAILABILITY_EXCEPTIONS (TEACHER_ID);
```

## 6. REST API

All endpoints are authenticated via JWT. Roles below are enforced centrally in
`SecurityConfig` by HTTP method + path prefix (there are **no** per-method
`@PreAuthorize` annotations). All responses are wrapped in the common
`ApiResponse<T>` envelope. When routed through the API gateway the base URL is
`http://localhost:8080`; direct access is `http://localhost:8082`.

The full `SecurityConfig` rule set: `POST`/`PUT`/`DELETE` on `/students/**`,
`/teachers/**`, `/parents/**` → `PRINCIPAL`; `GET /users/login-id/available` →
`PRINCIPAL`; `GET /teachers/**` → PRINCIPAL/TEACHER/STUDENT; `GET /students/**` and
`GET /parents/**` → PRINCIPAL/TEACHER/STUDENT/PARENT; everything else authenticated.

### `/students`

| Method | Path | Auth (roles) | Description |
|--------|------|--------------|-------------|
| GET | `/students/me` | PRINCIPAL, TEACHER, STUDENT, PARENT (GET `/students/**`) | Authenticated student's own profile |
| PUT | `/students/me` | PRINCIPAL (PUT `/students/**`) | Update own contact details (self-update DTO) |
| GET | `/students` | PRINCIPAL, TEACHER, STUDENT, PARENT | List all students (paginated, default size 20) |
| GET | `/students/{id}` | PRINCIPAL, TEACHER, STUDENT, PARENT | Get one student by UUID |
| POST | `/students` | PRINCIPAL | Create a student (publishes `student-created`) |
| PUT | `/students/{id}` | PRINCIPAL | Update a student |
| DELETE | `/students/{id}` | PRINCIPAL | Delete a student |

### `/teachers`

| Method | Path | Auth (roles) | Description |
|--------|------|--------------|-------------|
| GET | `/teachers/me` | PRINCIPAL, TEACHER, STUDENT (GET `/teachers/**`) | Authenticated teacher's own profile |
| PUT | `/teachers/me` | PRINCIPAL (PUT `/teachers/**`) | Update own contact details |
| GET | `/teachers` | PRINCIPAL, TEACHER, STUDENT | List all teachers (paginated) |
| GET | `/teachers/{id}` | PRINCIPAL, TEACHER, STUDENT | Get one teacher |
| POST | `/teachers` | PRINCIPAL | Create a teacher (publishes `teacher-created`) |
| PUT | `/teachers/{id}` | PRINCIPAL | Update a teacher |
| DELETE | `/teachers/{id}` | PRINCIPAL | Delete a teacher (also removes availability + exceptions) |
| GET | `/teachers/{id}/availability` | PRINCIPAL, TEACHER, STUDENT | List recurring weekly availability slots |
| PUT | `/teachers/{id}/availability` | PRINCIPAL | Replace **all** availability slots for the teacher |
| GET | `/teachers/{id}/availability-exceptions` | PRINCIPAL, TEACHER, STUDENT | List one-off exceptions (newest first) |
| POST | `/teachers/{id}/availability-exceptions` | PRINCIPAL | Add a one-off exception |
| DELETE | `/teachers/{id}/availability-exceptions/{exceptionId}` | PRINCIPAL | Delete a specific exception |

### `/parents`

| Method | Path | Auth (roles) | Description |
|--------|------|--------------|-------------|
| GET | `/parents/me` | PRINCIPAL, TEACHER, STUDENT, PARENT (GET `/parents/**`) | Authenticated parent's own profile |
| GET | `/parents/me/children` | PRINCIPAL, TEACHER, STUDENT, PARENT | All child links for the authenticated parent |
| PUT | `/parents/me` | PRINCIPAL (PUT `/parents/**`) | Update own contact details (applied to all rows sharing the login) |
| GET | `/parents` | PRINCIPAL, TEACHER, STUDENT, PARENT | List all parents (paginated) |
| GET | `/parents/{id}` | PRINCIPAL, TEACHER, STUDENT, PARENT | Get one parent |
| POST | `/parents` | PRINCIPAL | Create a parent / add a child link (publishes `parent-created` on first login) |
| PUT | `/parents/{id}` | PRINCIPAL | Update a parent row |
| DELETE | `/parents/{id}` | PRINCIPAL | Delete a parent row |

### `/users`

| Method | Path | Auth (roles) | Description |
|--------|------|--------------|-------------|
| GET | `/users/login-id/available?loginId=...` | PRINCIPAL | Returns `{"available": true|false}` — whether the login ID is free across all user types |

### Request JSON — create a student (`POST /students`)

```json
{
  "loginId": "student5",
  "firstName": "Ishaan",
  "lastName": "Mehta",
  "dob": "2011-03-14",
  "email": "student5@artacademy.test",
  "phone": "9100000010",
  "address": "22 Hill Road, Mumbai",
  "enrollmentDate": "2025-08-01",
  "status": "ACTIVE",
  "additionalRoles": []
}
```
`temporaryPassword` is optional; if blank/absent the service defaults it to the
config-server property `artacademy.user.default-temporary-password` before publishing
the auth event. Required fields: `loginId`, `firstName`, `dob`, `status`.

### Request JSON — create a teacher (`POST /teachers`)

```json
{
  "loginId": "teacher3",
  "firstName": "Neha",
  "lastName": "Iyer",
  "employeeCode": "EMP-003",
  "email": "teacher3@artacademy.test",
  "phone": "9000000003",
  "qualification": "M.F.A Printmaking",
  "joiningDate": "2025-02-01",
  "status": "ACTIVE",
  "additionalRoles": ["PRINCIPAL"]
}
```
Required fields: `loginId`, `firstName`, `employeeCode` (≤ 50 chars, unique),
`joiningDate`, `status`.

### Request JSON — replace availability (`PUT /teachers/{id}/availability`)

The body is a **JSON array** that fully replaces existing slots:

```json
[
  { "dayOfWeek": "MONDAY",    "startTime": "09:00", "endTime": "12:00" },
  { "dayOfWeek": "MONDAY",    "startTime": "14:00", "endTime": "17:00" },
  { "dayOfWeek": "WEDNESDAY", "startTime": "10:00", "endTime": "13:00" }
]
```
`dayOfWeek` is a Java `DayOfWeek` enum value (`MONDAY`..`SUNDAY`); all three fields
are required per slot.

### Request JSON — add an exception (`POST /teachers/{id}/availability-exceptions`)

Full-day leave:

```json
{
  "date": "2026-09-21",
  "reason": "Sick leave",
  "unavailableAllDay": true
}
```

Partial-day unavailability:

```json
{
  "date": "2026-09-22",
  "reason": "Doctor appointment",
  "unavailableAllDay": false,
  "startTime": "13:00",
  "endTime": "15:00"
}
```
When `unavailableAllDay` is `true`, the service **nulls out** `startTime`/`endTime`
regardless of what was sent. Only `date` is required.

### Request JSON — create a parent (`POST /parents`)

```json
{
  "loginId": "9100000010",
  "firstName": "Rohit",
  "lastName": "Mehta",
  "parentName": "Rohit Mehta",
  "relationship": "FATHER",
  "phone": "9100000010",
  "email": "parent2@artacademy.test",
  "address": "22 Hill Road, Mumbai",
  "occupation": "Engineer",
  "childStudentIds": ["00000000-0000-0000-0003-000000000005"],
  "status": "ACTIVE"
}
```
A parent's `loginId` and auth username are their `phone`. Required fields:
`firstName`, `phone`, `status`. `childStudentIds` is optional (zero or more existing
students); re-posting the same phone dedupes to the existing parent and just adds the
new child links.

## 7. Service Logic

### Self vs. admin access

- **Self endpoints (`/me`, `/me/children`)** resolve the caller from
  `Authentication.getName()` (the JWT subject = `loginId`) and look the profile up
  by `loginId`. Self-updates use dedicated `*SelfUpdateRequest` DTOs that expose only
  a safe subset of contact fields (name, email, phone, address, etc.)
  and never touch identity keys such as `employeeCode` or `status`. A student's
  `/me` update changes only its own profile and never creates or links parent rows.
- **Admin endpoints (create/update/delete by `{id}`)** are PRINCIPAL-only and operate
  by UUID. Missing entities raise `ApiException.notFound`; duplicate `loginId` /
  `employeeCode` raise `ApiException.conflict`.

### Student / Teacher / Parent creation

1. Validate uniqueness at the service layer — `existsByLoginId` (all users),
   `EmailUniquenessValidator.assertEmailAvailable` for email, and, for teachers,
   `existsByEmployeeCode`. On update paths the same checks run while excluding the
   row being updated.
2. Map the request to the entity and `save` it (JOINED insert into `USERS` + child).
3. Build the role list: base role (`STUDENT` / `TEACHER` / `PARENT`) plus any
   distinct `additionalRoles`.
4. Publish the corresponding `*-created` event carrying the new UUID, username
   (`loginId`), email, a resolved temporary password (defaulting to the config-server
   property `artacademy.user.default-temporary-password` when the request omits it),
   names, and roles.

### Parent linking & multi-child logic

A parent is a single row keyed by their UUID, linked to zero or more students via
the `PARENT_STUDENTS` join table. A parent's `loginId` (and auth username) **is their
phone number**, so parents are deduped by phone (`ParentRepository.findByPhone`).
`createParent` accepts a set of `childStudentIds`. It publishes `parent-created`
**only when the parent login is first created** (`firstAccount = !existsByLoginId(...)`,
i.e. no existing parent for that phone); re-posting the same phone dedupes to the
existing parent and simply **adds the new child links** without re-publishing an auth
event. `getMyChildren`, `getParentByLoginId`, and `updateMyProfile` operate over the
single parent row resolved by `loginId`/`findByPhone` and its `children` collection.
Parent responses are enriched with each linked student's display name.

A student updating `/me` changes only its own profile; it does **not** create or link
any parent records.

### Availability handling

- `getAvailability(teacherId)` validates the teacher exists, then returns the slots.
- `updateAvailability(teacherId, requests)` is a **full replace**: it
  `deleteByTeacherId` first, then persists the supplied list. There is no partial
  merge.

### Exceptions handling

- `getExceptions` returns rows `OrderByDateDesc` (newest first).
- `addException` forces `startTime`/`endTime` to `null` when `unavailableAllDay` is
  true.
- `deleteException` verifies the exception belongs to the given `teacherId` before
  deleting; a mismatch is reported as not-found.
- Deleting a teacher cascades: the service explicitly deletes exceptions and
  availability rows before removing the teacher.

### Login-ID availability check

`UserAccountService.isLoginIdAvailable(loginId)` returns
`!userRepository.existsByLoginId(loginId)` — i.e. true when **no** user of any type
already owns that login. The controller wraps it as `{"available": <boolean>}`.
Restricted to PRINCIPAL (used by the create-user UI).

## 8. Kafka Producers

This service is a **producer only** (no `@KafkaListener` anywhere). Topic name
constants live in `common-library` at
`com.artacademy.common.events.KafkaTopics`. Producer settings
(`KafkaProducerConfig`): `StringSerializer` key, `JsonSerializer` value, type-info
headers disabled, `acks=all`, `retries=3`, idempotence enabled. The **message key is
the new person's UUID string**.

| Topic constant | Topic name | Event class | Published when | Payload fields |
|----------------|------------|-------------|----------------|----------------|
| `KafkaTopics.STUDENT_CREATED` | `student-created` | `StudentCreatedEvent` | After a student is saved (`POST /students`) | `studentId` (UUID), `username`, `email`, `temporaryPassword`, `firstName`, `lastName`, `roles` (List, defaults `["STUDENT"]`), `occurredAt` |
| `KafkaTopics.TEACHER_CREATED` | `teacher-created` | `TeacherCreatedEvent` | After a teacher is saved (`POST /teachers`) | `teacherId` (UUID), `username`, `email`, `temporaryPassword`, `employeeCode`, `firstName`, `lastName`, `roles` (defaults `["TEACHER"]`), `occurredAt` |
| `KafkaTopics.PARENT_CREATED` | `parent-created` | `ParentCreatedEvent` | After the parent login is **first** created (`POST /parents`); not on subsequent child-link additions | `parentId` (UUID), `username`, `email`, `phone` (the parent's phone, which is also the username), `temporaryPassword`, `firstName`, `lastName`, `roles` (defaults `["PARENT"]`), `occurredAt` |
| `KafkaTopics.STUDENT_DELETED` | `student-deleted` | `StudentDeletedEvent` | After a student is deleted (`DELETE /students/{id}`) | `studentId` (UUID), `occurredAt` |
| `KafkaTopics.TEACHER_DELETED` | `teacher-deleted` | `TeacherDeletedEvent` | After a teacher is deleted (`DELETE /teachers/{id}`) | `teacherId` (UUID), `occurredAt` |
| `KafkaTopics.PARENT_DELETED` | `parent-deleted` | `ParentDeletedEvent` | After a parent is deleted (`DELETE /parents/{id}`) | `parentId` (UUID), `occurredAt` |

The auth-service consumes the `*-created` events and creates a login **with the same
UUID**, the given temporary password, and the roles — realizing the shared-UUID
contract. The `*-deleted` events let downstream services tear down the matching rows.

## 9. Migrations

Clean-slate Flyway layout:

- `db/migration/V1__init_user_schema.sql` — schema only (tables, indexes, FKs). Always
  applied.
- `db/seed/V2__seed_dev_data.sql` — profile-gated dev/docker seed. The `db/seed`
  location is added to `spring.flyway.locations` **only under the `docker` profile**
  (see `config-server/config/user-service.yml`), so production runs schema only.

The seed inserts profile rows whose UUIDs match `auth_db`. `USERS` rows carry
`EMAIL` and `PHONE_NUMBER`: teacher1/teacher2 have phones `9000000001`/`9000000002`,
students have `NULL` phone, and the parent row's `LOGIN_ID` **is its phone**
(`9100000002`, so username = phone), name Sunita Nair, email
`parent1@artacademy.test`, phone `9100000002`.

| Row | UUID (suffix) | Type | loginId | Name | Extra |
|-----|---------------|------|---------|------|-------|
| teacher1 | `...0002-...0001` | TEACHER | teacher1 | Aisha Khan | EMP-001, phone 9000000001 |
| teacher2 | `...0002-...0002` | TEACHER | teacher2 | Rahul Verma | EMP-002, phone 9000000002 |
| student1 | `...0003-...0001` | STUDENT | student1 | Meera Nair | linked to the parent below |
| student2 | `...0003-...0002` | STUDENT | student2 | Arjun Sharma | |
| student3 | `...0003-...0003` | STUDENT | student3 | Diya Patel | |
| student4 | `...0003-...0004` | STUDENT | student4 | Kabir Singh | |
| parent | `...0004-...0001` | PARENT | 9100000002 | Sunita Nair | phone/username 9100000002 → student1 |

The parent is linked to student1 through the `PARENT_STUDENTS` join table. Inserts are
idempotent (`ON CONFLICT ... DO NOTHING`). `ddl-auto` is `validate`, so Hibernate never
mutates the schema — Flyway is the single source of truth.
