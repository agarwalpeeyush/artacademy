# user-service — Design

Master data service for people: students, teachers, and parents. Port 8082, database `user_db`. Base paths `/users`, `/students`, `/teachers`, `/parents`. Spring Boot 3.3.4 / Java 21, PostgreSQL (Flyway validate), Kafka, JWT via common-library. Responses wrapped in `ApiResponse<T> {success, message, data}`.

## Data Model

JOINED inheritance: a `USERS` base table (id UUID, loginId, firstName required, lastName, email, phone) with subtype tables.

| Subtype | Fields |
|---------|--------|
| Student | dob, address, schoolName, className, enrollmentDate, status, parents (M2M) |
| Teacher | employeeCode (unique), qualification, joiningDate, status |
| Parent | parentName, relationship (enum), address, occupation, status, children (M2M → Student) |

`loginId` uniqueness is enforced at the service layer (parents may be phone-only).

## Endpoints

### UserController (`/users`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/users/login-id/available` | Check login id availability |

### StudentController (`/students`)
| Method | Path | Notes |
|--------|------|-------|
| GET/PUT | `/students/me` | Self profile |
| GET | `/students` | Paginated |
| GET | `/students/{id}` | |
| POST | `/students` | Emits `student-created`; auto-provisions parent if guardian named |
| PUT | `/students/{id}` | |
| DELETE | `/students/{id}` | Emits `student-deleted` (+ `parent-deleted` if parent orphaned) |

### TeacherController (`/teachers`)
| Method | Path | Notes |
|--------|------|-------|
| GET/PUT | `/teachers/me` | Self profile |
| GET | `/teachers` | Paginated |
| GET | `/teachers/{id}` | |
| POST | `/teachers` | Emits `teacher-created` |
| PUT | `/teachers/{id}` | |
| DELETE | `/teachers/{id}` | Emits `teacher-deleted` |
| GET/PUT | `/teachers/{id}/availability` | Recurring weekly slots |
| GET/POST | `/teachers/{id}/availability-exceptions` | One-off leave/sick (all-day or partial) |
| DELETE | `/teachers/{id}/availability-exceptions/{exceptionId}` | Remove an exception |

### ParentController (`/parents`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/parents/me` | Self profile |
| GET | `/parents/me/children` | Own children |
| PUT | `/parents/me` | Update self |
| GET | `/parents` | Paginated |
| GET | `/parents/{id}` | |
| POST | `/parents` | Emits `parent-created` |
| PUT | `/parents/{id}` | |
| DELETE | `/parents/{id}` | Emits `parent-deleted` |

## Migrations

| Version | Description |
|---------|-------------|
| V1 | `init_user_schema.sql` |
| V2 | `db/seed` — docker profile only |

## Kafka

- **Produces:** the six lifecycle events — `student-created`, `student-deleted`, `teacher-created`, `teacher-deleted`, `parent-created`, `parent-deleted`.
- **Consumes:** none.
