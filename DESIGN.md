# Art Academy Platform — Design Document

## Platform Overview

The Art Academy Platform is a microservices-based educational management system built with **Spring Boot 3.3.4** and **Spring Cloud 2023.0.3**. It manages courses, teachers, students, parents, enrolments, timetabling, attendance, payments, notifications, and reporting for an art academy.

The platform follows a **database-per-service** pattern: each business service owns its own PostgreSQL schema and never reaches into another service's tables. Cross-service consistency is achieved through **Kafka events** (choreographed sagas) and lightweight read-model caches (the payment service's `ENROLLMENT_CACHE`, the reporting service's materialised projections). Where a service needs another service's data on the read path (name enrichment), it calls over a **load-balanced WebClient** forwarding the caller's JWT — it does not share tables.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.3.4 |
| Service mesh | Spring Cloud 2023.0.3 (Eureka + Config Server + Gateway) |
| Database | PostgreSQL 16 — one logical DB per service |
| Migration | Flyway (`ddl-auto: validate` — schema must match entities) |
| Messaging | Apache Kafka |
| Cache / rate-limit store | Redis 7 |
| Security | JWT (JJWT) + Spring Security, BCrypt password hashing |
| ORM | Spring Data JPA / Hibernate (JOINED inheritance for user types) |
| Mapping | MapStruct, Lombok |
| Frontend | React 18 + TypeScript + MUI v5 + Redux Toolkit |
| API docs | SpringDoc OpenAPI |
| Observability | ELK stack (Elasticsearch, Logstash, Kibana) |
| Packaging | Docker, Docker Compose, Kubernetes, Helm |

---

## Service Inventory

There are **11 Maven modules** (one shared library + three infrastructure services + seven business services), plus the React frontend. There is **no standalone timetable service** — timetabling lives inside the course-enrollment-service. There is **no separate "class" concept** — the model is course + weekly timetable slots (batches).

| # | Service | Port (local → Docker host) | Database | Responsibility |
|---|---------|-----------------------------|----------|----------------|
| 0 | Common Library | — | — | Shared JWT utils, exceptions, `ApiResponse`, Kafka event DTOs + `KafkaTopics`, logback config |
| 1 | Service Registry (Eureka) | 8761 → 8761 | — | Service discovery |
| 2 | Config Server | 8888 → 8888 | — | Centralised configuration (native, classpath `config/*.yml`) |
| 3 | API Gateway | 8080 → 18080 | — | Routing, JWT validation, CORS, Redis rate limiting |
| 4 | Auth Service | 8081 → 8081 | `auth_db` | Login, JWT issue/refresh, roles, password reset, audit log, user/role management, bootstrap admin |
| 5 | User Service | 8082 → 8082 | `user_db` | Teacher / student / parent profiles, teacher weekly availability + one-off exceptions |
| 6 | Course Enrollment Service | 8083 → 8083 | `academic_db` | Courses, course types, enrolments, **timetable slots**, exams |
| 7 | Attendance Service | 8084 → 8084 | `attendance_db` | Student & teacher attendance (per timetable slot + date), correction audit |
| 8 | Payment Service | 8086 → 8086 | `payment_db` | Fee cycles, fee details, payments, FIFO allocations, enrolment read-cache |
| 9 | Notification Service | 8087 → 8087 | `notification_db` | Email notifications, announcements, broadcast permissions, Kafka consumer |
| 10 | Reporting Service | 8088 → 8088 | `reporting_db` | Materialised summaries, revenue/attendance analytics, defaulters |
| — | Frontend (React) | 3000 → 3000 (container 80) | — | Role-based SPA (Principal / Teacher / Student / Parent) |

> In Docker, all logical databases live in a single shared `postgres` container (`artacademy-postgres`, host port **15432**). Kafka is exposed on host **19092**, Redis on **16379**, Kibana on **5601**.

---

## Startup Order

```
1. service-registry    (8761)  — Eureka server
2. config-server       (8888)  — registers with Eureka; serves all service config from classpath
3. api-gateway         (8080)  — imports config, discovers services
4. auth-service        (8081)  — needs Kafka (consumes user-created events)
5. user-service        (8082)
6. course-enrollment-service (8083)  — needs Kafka
7. attendance-service  (8084)  — needs Kafka
8. payment-service     (8086)  — needs Kafka
9. notification-service (8087) — needs Kafka + SMTP
10. reporting-service  (8088)  — needs Kafka
```

Each service runs its own Flyway migrations on startup. The base schema (`V1__init_*.sql` under `db/migration`) is always applied. Under the **`docker`/`dev` profile only**, an additional `db/seed` location is added so `V2__seed_dev_data.sql` also runs. Seed data is idempotent (`ON CONFLICT DO NOTHING`), so restarts never duplicate rows, and a clean (default-profile) start creates schema **only** — no demo data.

---

## Data Model Highlights

### Course / timetable model (no "class")

The academic model is **Course → Timetable slot (batch) → Enrolment assignment**:

- A **Course** has a code/name/type, duration, and a set of **fees** (`ADMISSION`, `MONTHLY`, `EXAM`, `ONE_TIME_SHORT_TERM`; each `RECURRING` or `ONE_TIME`).
- A **Timetable** row is a recurring weekly slot for a course: `courseId`, `teacherId`, `dayOfWeek`, `startTime`, `endTime`. It is the *plan*.
- An **Enrolment** ties a student to a course (`UNIQUE(studentId, courseId)`), carries its own fee lines snapshotted at enrolment time, and is assigned to one or more timetable slots via the `ENROLLMENT_TIMETABLES` join table.

There is no `CourseClass`/`ClassController`/`ClassSession` — those were removed in the class-centric → course/timetable-centric refactor.

### Attendance model (per slot + date, with recorded times)

Attendance is keyed to a **timetable slot and a calendar date**, not to a weekday, so an extra or rescheduled class on any date is supported:

- `STUDENT_ATTENDANCE` — unique on `(studentId, timetableId, attendanceDate)`; carries `status` plus nullable **`startTime`/`endTime`** (the actual session times, prefilled from the slot but editable and persisted per record — the timetable itself is never changed).
- `TEACHER_ATTENDANCE` — unique on `(teacherId, timetableId, attendanceDate)`.
- `ATTENDANCE_CORRECTION` — an audit-log row written on every direct edit (no approval workflow): who edited, role, old/new status, reason, timestamp.

### Cross-service identity

A person has **one UUID** that is identical across every database:

- `auth_db.USERS.ID` == `user_db.USERS.ID` (and the subtype table `STUDENTS`/`TEACHERS`/`PARENTS`).
- `auth_db.USERS.USERNAME` == `user_db.USERS.LOGIN_ID`.
- That same UUID appears as `STUDENT_ID` / `TEACHER_ID` in `academic_db`, `attendance_db`, and `payment_db`.

At runtime this is enforced by the flow: user-service creates the profile and publishes a `*-created` event carrying the UUID; auth-service consumes it and persists an auth user with the **same** ID (merging roles and self-deactivating the bootstrap admin once a real principal exists).

### User inheritance (user_db)

`USERS` is the base table (JOINED inheritance). `STUDENTS`, `TEACHERS`, and `PARENTS` are child tables keyed by the same `ID`. A `PARENT` links to `STUDENT`s many-to-many; deleting the last student that references an auto-provisioned parent cascades a parent deletion.

---

## Kafka Event Flow

Topic names use hyphens; the constants live in `common-library/events/KafkaTopics.java`. Topics are auto-created.

```
user-service ──► student-created, teacher-created, parent-created
                   ├──► auth-service      (creates matching auth user + roles; deactivates bootstrap)
                   └──► reporting-service  (creates Student/Teacher report row)
             ──► student-deleted, teacher-deleted, parent-deleted
                   └──► auth-service      (deletes the auth user)

course-enrollment-service ──► enrollment-created, enrollment-cancelled
                   ├──► payment-service    (updates ENROLLMENT_CACHE; one-time fees; recurring total)
                   └──► reporting-service  (adjusts StudentReport enrolment count)
                          ──► exam-scheduled
                   ├──► payment-service    (generates one-time EXAM fees)
                   └──► notification-service (exam notice to enrolled students)

attendance-service ──► attendance-recorded, attendance-updated
                   ├──► reporting-service  (attendance summary buckets)
                   └──► notification-service (absent alert on attendance-recorded when ABSENT)

payment-service ──► fee-generated
                   ├──► reporting-service  (revenue billed)
                   └──► notification-service (fee reminder)
              ──► payment-received
                   ├──► reporting-service  (revenue collected)
                   └──► notification-service (payment confirmation)
              ──► fee-status-updated
                   └──► (no active consumer today)

auth-service ──► notification-request  (password-reset email)
                   └──► notification-service
```

---

## API Gateway Route Summary

All requests enter at `http://localhost:8080` (local) or `http://localhost:18080` (Docker). Routes do **not** strip the path prefix — downstream services see the full path. Every route except `/auth/**` runs the gateway JWT filter, which validates the bearer token and injects `X-Auth-User` and `X-Auth-Roles` headers.

| Path prefixes | Downstream service | JWT filter |
|---------------|-------------------|-----------|
| `/auth/**` | auth-service | No (auth-service enforces per-endpoint) |
| `/students/**`, `/teachers/**`, `/parents/**`, `/users/**` | user-service | Yes |
| `/courses/**`, `/course-types/**`, `/enrollments/**`, `/timetables/**`, `/exams/**` | course-enrollment-service | Yes |
| `/attendance/**` | attendance-service | Yes |
| `/fees/**`, `/payments/**` | payment-service | Yes |
| `/notifications/**` | notification-service | Yes |
| `/reports/**` | reporting-service | Yes |

A global CORS filter applies to `/**`, and a Redis-backed request rate limiter (replenish 100 / burst 200) protects routes. Services are discovered via Eureka (`http://localhost:8761/eureka/`).

> **Response envelope:** most services wrap responses in `ApiResponse<T>` (`{success, message, data}`). The **`TimetableController` in course-enrollment-service returns raw arrays/objects** (no envelope); the frontend's `unwrap` (`r.data?.data ?? r.data`) handles both.

---

## Role-Based Access Summary

Role strings are `ADMIN`, `PRINCIPAL`, `TEACHER`, `STUDENT`, `PARENT` (JWT authorities prefixed `ROLE_`). A person may hold several roles; **principal takes precedence** over teacher in the frontend's routing and role-gated screens (a principal who also teaches lands as principal).

| Role | Access |
|------|--------|
| `PRINCIPAL` | Full access: manage users/roles, teachers, students, parents, courses, course types, enrolments, timetable, exams; mark & correct attendance; revenue/defaulters/analytics; announcements & broadcast permissions; audit logs |
| `TEACHER` | Mark student attendance; record own attendance; edit attendance (audited); view assigned students & fee status; view own timetable; manage own availability exceptions; broadcast announcements when granted permission |
| `STUDENT` | View own profile, enrolments, timetable, upcoming classes, attendance & stats, fees; make payments; view receipts; view notifications |
| `PARENT` | View linked children, their attendance, upcoming classes and fees; pay children's fees; receive notifications |

---

## Frontend Architecture

- **Routing** (`App.tsx`): nested routes under role-prefixed layouts (`/principal`, `/teacher`, `/student`, `/parent`). `ProtectedRoute` enforces authentication and `requiredRole`; a `bootstrap` admin is forced to `/principal/create-principal`; role-landing precedence is Principal → Teacher → Parent → Student.
- **State**: Redux Toolkit slices per domain — `auth`, `course`, `enrollment`, `timetable`, `attendance`, `correction`, `student`, `teacher`, `parent`, `fee`, `payment`, `notification`, `announcement`, `report` — each using `createAsyncThunk`.
- **API access**: axios client (`services/api.ts`), base URL `REACT_APP_API_URL` (default `http://localhost:8080`), JWT request interceptor, 401 → logout, and a response normaliser `unwrap = r => r.data?.data ?? r.data` (plus a `toArray` paging helper) used by every service module.
- **Shared components**: `PageHeader`, `DataTable`, `LoadingSpinner`, `ConfirmDialog`, `ProtectedRoute`, `LoginIdField`; role sidebars + `MainLayout`.

---

## Observability — Centralised Logging (ELK Stack)

All services ship structured logs via `logback-spring.xml` (from `common-library`):

- **Non-docker profile** — human-readable text to stdout (CONSOLE).
- **Docker profile** — CONSOLE plus JSON over TCP to `logstash:5000` (LOGSTASH); each line carries a `service` field (`${spring.application.name}`).

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `elasticsearch` | elasticsearch 8.14 | 9200 | Log storage / search |
| `logstash` | logstash 8.14 | 5000 (TCP) | Ingest JSON → Elasticsearch (`artacademy-logs-YYYY.MM.dd`) |
| `kibana` | kibana 8.14 | 5601 | Search / visualise |

Useful KQL: `service: "auth-service"`, `level: "ERROR"`, `service: "payment-service" AND level: "ERROR"`.

---

## Related Documents

- **[README.md](README.md)** — build & run instructions (Docker, manual, Kubernetes).
- **[PRD.md](PRD.md)** — product requirements and functional feature catalogue by role.
- Each service folder also contains its own `DESIGN.md` and `PRD.md` with endpoint-level detail.
