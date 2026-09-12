# User Service — Product Requirements Document

## Purpose

The User Service is the platform's **system of record for people** — students,
teachers, and parents — at Art Academy. It manages profile master data, teacher
availability (recurring weekly slots and one-off exceptions), and the linkage of
parents to their children. It also acts as the **origin of identity provisioning**:
creating a profile here triggers login creation in the auth-service via Kafka, using
a **shared UUID** so the same person is identifiable across every service database.

## Scope

**In scope**

- CRUD for students, teachers, and parents (PRINCIPAL-managed).
- Self-service profile read/update (`/me`) for each role.
- Parent-to-student linking, including one parent linked to multiple children.
- Teacher recurring weekly availability (full-replace semantics).
- Teacher one-off availability exceptions (leave / sick / partial-day).
- Login-ID availability check across all user types.
- Publishing `student-created`, `teacher-created`, `parent-created` events.

**Out of scope**

- Login credentials, password hashing, JWT issuance, role storage (owned by
  auth-service).
- Enrollment, timetabling, attendance, fees, notifications (owned by their
  respective services).
- Consuming any Kafka events (this service is producer-only).

## Functional Requirements

| ID | Requirement | Roles | Endpoint |
|----|-------------|-------|----------|
| PPL-01 | Create a teacher profile with unique employee code; publish `teacher-created` | PRINCIPAL | `POST /teachers` |
| PPL-02 | Update an existing teacher by ID | PRINCIPAL | `PUT /teachers/{id}` |
| PPL-03 | Delete a teacher (cascades availability + exceptions) | PRINCIPAL | `DELETE /teachers/{id}` |
| PPL-04 | List all teachers (paginated) | PRINCIPAL, TEACHER, STUDENT | `GET /teachers` |
| PPL-05 | View a single teacher's detail by ID | PRINCIPAL, TEACHER, STUDENT | `GET /teachers/{id}` |
| PPL-06 | Teacher views/updates own profile | (self via GET/PUT rules) | `GET /teachers/me`, `PUT /teachers/me` |
| PPL-07 | Create a student profile; publish `student-created` | PRINCIPAL | `POST /students` |
| PPL-08 | Update an existing student by ID | PRINCIPAL | `PUT /students/{id}` |
| PPL-09 | Delete a student | PRINCIPAL | `DELETE /students/{id}` |
| PPL-10 | List all students (paginated) | PRINCIPAL, TEACHER, STUDENT, PARENT | `GET /students` |
| PPL-11 | View a single student's detail by ID | PRINCIPAL, TEACHER, STUDENT, PARENT | `GET /students/{id}` |
| PPL-12 | Student views/updates own profile | (self via GET/PUT rules) | `GET /students/me`, `PUT /students/me` |
| PPL-13 | Create a parent (linked to zero or more students); publish `parent-created` on first creation | PRINCIPAL | `POST /parents` |
| PPL-14 | Re-post an existing parent (same phone) to add a child link (no new auth event) | PRINCIPAL | `POST /parents` (same phone/`loginId`) |
| PPL-15 | Update / delete a parent row by ID | PRINCIPAL | `PUT /parents/{id}`, `DELETE /parents/{id}` |
| PPL-16 | Parent views own profile and lists linked children | PRINCIPAL, TEACHER, STUDENT, PARENT | `GET /parents/me`, `GET /parents/me/children` |
| PPL-17 | Parent updates own contact details | (self via PUT rule) | `PUT /parents/me` |
| PPL-18 | List / view parents (paginated, single) | PRINCIPAL, TEACHER, STUDENT, PARENT | `GET /parents`, `GET /parents/{id}` |
| PPL-19 | Get a teacher's recurring weekly availability | PRINCIPAL, TEACHER, STUDENT | `GET /teachers/{id}/availability` |
| PPL-20 | Replace a teacher's full availability slot list | PRINCIPAL | `PUT /teachers/{id}/availability` |
| PPL-21 | List a teacher's one-off availability exceptions (newest first) | PRINCIPAL, TEACHER, STUDENT | `GET /teachers/{id}/availability-exceptions` |
| PPL-22 | Add a one-off availability exception (all-day or partial) | PRINCIPAL | `POST /teachers/{id}/availability-exceptions` |
| PPL-23 | Delete a specific availability exception | PRINCIPAL | `DELETE /teachers/{id}/availability-exceptions/{exceptionId}` |
| PPL-24 | Check whether a login ID is available across all user types | PRINCIPAL | `GET /users/login-id/available` |

## Business Rules

1. **Shared UUID across databases** — a person's UUID is generated once and reused in
   `user_db`, `auth_db`, and downstream services. When the User Service creates a
   profile it publishes a `*-created` event carrying that UUID, and the auth-service
   creates the matching login with the **same** UUID.
2. **User Service does not own credentials** — passwords and roles live in
   auth-service. The `*-created` event carries a `temporaryPassword` (defaulting to the
   config-server value `artacademy.user.default-temporary-password` when the UI omits it)
   and a role list for provisioning.
3. **Unique login ID across all user types** — enforced at the **service layer**
   (`existsByLoginId`); there is no `USERS.LOGIN_ID` DB unique constraint. `loginId`
   equals the auth username. Email uniqueness (where an email is present) is likewise a
   service-layer check, excluding the row being updated.
4. **Unique teacher employee code** — enforced at create and update.
5. **JOINED inheritance** — every person is a `USERS` row plus one child-table row
   sharing the same ID; child FKs cascade-delete from `USERS`.
6. **Parent multi-child model** — a parent is a single `PARENTS` row whose children are
   held in the `PARENT_STUDENTS` join table (many-to-many). A parent's identity is the
   phone number (also its `loginId`); re-posting the same phone dedupes to the existing
   parent and simply adds the new child link. The `parent-created` auth event is
   published only when the parent login is first created, not on subsequent child links.
7. **Parent must reference existing students** — `POST /parents` fails with not-found if
   any supplied `childStudentId` does not exist.
8. **Availability replace semantics** — `PUT .../availability` deletes all existing
   slots for the teacher before inserting the new set (not a merge).
9. **All-day exceptions clear times** — when `unavailableAllDay` is true, start/end
   times are stored as null.
10. **Exception ownership check** — deleting an exception requires it to belong to the
    teacher named in the path.
11. **Self-service is scoped** — `/me` updates only change safe contact fields, never
    identity keys (`employeeCode`, `status`, links). A student updating `/me` changes
    only their own profile; it does not create or link parent records.
12. **Authorization is method+path based** — enforced centrally in `SecurityConfig`;
    all mutations are PRINCIPAL-only.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| PostgreSQL `user_db` | Persistent store (JOINED-inheritance schema) |
| Apache Kafka | Publishes `student-created` / `teacher-created` / `parent-created` |
| auth-service | Consumes the `*-created` events; creates logins with the shared UUID |
| Config Server (`:8888`) | Externalized config (datasource, port, Flyway locations) |
| Eureka | Service discovery / registration |
| API Gateway (`:8080`) | Front-door routing and JWT propagation |
| common-library | `ApiResponse`, `ApiException`, `KafkaTopics`, event DTOs, `JwtAuthenticationFilter` |
