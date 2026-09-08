# Art Academy Platform — Design Document

## Platform Overview

The Art Academy Platform is a microservices-based educational management system built with **Spring Boot 3.3.4** and **Spring Cloud 2023.0.3**. It manages courses, teachers, students, parents, attendance, scheduling, payments, notifications, and reporting for an art academy.

The platform follows a **database-per-service** pattern: each business service owns its own PostgreSQL schema and never reaches into another service's tables. Cross-service consistency is achieved through **Kafka events** (choreographed sagas) and lightweight read-model caches (e.g. the payment service's `ENROLLMENT_CACHE`).

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.3.4 |
| Service Mesh | Spring Cloud 2023.0.3 (Eureka + Config Server + Gateway) |
| Database | PostgreSQL 16 (separate DB per service) |
| Migration | Flyway (`ddl-auto: validate` — schema must match entities) |
| Messaging | Apache Kafka 7.6 |
| Cache | Redis 7 |
| Security | JWT (JJWT 0.12.6) + Spring Security, BCrypt password hashing |
| ORM | Spring Data JPA / Hibernate (JOINED inheritance for user types) |
| Mapping | MapStruct 1.5.5.Final, Lombok |
| Frontend | React 18 + TypeScript + MUI v5 + Redux Toolkit |
| API Docs | SpringDoc OpenAPI 2.6.0 |
| Observability | ELK stack (Elasticsearch, Logstash, Kibana) |
| Packaging | Docker, Docker Compose, Kubernetes, Helm |

---

## Service Inventory

| # | Service | Port (local/Docker) | Database | Responsibility |
|---|---------|---------------------|----------|----------------|
| 0 | Common Library | — | — | Shared JWT utils, exceptions, Kafka event DTOs, `ApiResponse`, logback config |
| 1 | Service Registry (Eureka) | 8761 / 8761 | — | Service discovery |
| 2 | Config Server | 8888 / 8888 | — | Centralised configuration (`config-server/src/main/resources/config/*.yml`) |
| 3 | API Gateway | 8080 / 18080 | — | Routing, JWT validation, CORS |
| 4 | Auth Service | 8081 / 8081 | `auth_db` | Login, JWT issue/refresh, roles, password reset, audit log, user/role management |
| 5 | User Service | 8082 / 8082 | `user_db` | Teacher / student / parent profiles, teacher weekly availability + one-off exceptions |
| 6 | Course Enrollment Service | 8083 / 8083 | `academic_db` | Courses, classes, enrollments |
| 7 | Attendance Service | 8084 / 8084 | `attendance_db` | Student & teacher attendance, class sessions, correction workflow |
| 8 | Scheduling Service | 8085 / 8085 | `schedule_db` | Rooms, weekly timetable, draft/publish workflow, versions, conflicts, room availability, upcoming classes |
| 9 | Payment Service | 8086 / 8086 | `payment_db` | Fee cycles, fee details, payments, allocations |
| 10 | Notification Service | 8087 / 8087 | `notification_db` | Email/SMS notifications, Kafka consumer |
| 11 | Reporting Service | 8088 / 8088 | `reporting_db` | Materialised summaries, revenue/attendance analytics, defaulters |
| — | Frontend (React) | 3000 / 3000 | — | Role-based SPA (Principal / Teacher / Student / Parent) |

---

## Startup Order

```
1. service-registry    (8761)  — Eureka server
2. config-server       (8888)  — registers with Eureka; serves all service config
3. api-gateway         (8080)  — imports config, discovers services
4. auth-service        (8081)  — imports config; seeds roles + sample users (Flyway)
5. user-service        (8082)  — imports config; seeds sample profiles (Flyway)
6. course-enrollment-service (8083) — seeds sample courses/classes/enrollments
7. attendance-service  (8084)  — seeds sample attendance
8. scheduling-service  (8085)  — seeds sample rooms + published schedules
9. payment-service     (8086)  — needs Kafka; seeds sample fee cycles/payments
10. notification-service (8087) — needs Kafka + SMTP
11. reporting-service  (8088)  — needs Kafka
```

Each service runs its own Flyway migrations on startup. Seed data is idempotent (`ON CONFLICT DO NOTHING`), so restarts never duplicate rows.

---

## Data Model Highlights

### Cross-service identity

A person has **one UUID** that is identical across every database:

- `auth_db.USERS.ID` == `user_db.USERS.ID` (and the subtype table `STUDENTS`/`TEACHERS`/`PARENTS`).
- `auth_db.USERS.USERNAME` == `user_db.USERS.LOGIN_ID`.
- That same UUID appears as `STUDENT_ID` / `TEACHER_ID` in `academic_db`, `attendance_db`, `schedule_db`, and `payment_db`.

This is enforced by the flow: user-service creates the profile and publishes a `*.created` event carrying the UUID; auth-service consumes it and persists an auth user with the **same** ID. Seed migrations hard-code matching UUIDs to reproduce this without Kafka.

### User inheritance (user_db)

`USERS` is the base table (JOINED inheritance) with a `USER_TYPE` discriminator. `STUDENTS`, `TEACHERS`, and `PARENTS` are child tables keyed by the same `ID`. A `PARENT` links to a `STUDENT` via `PARENTS.STUDENT_ID`.

### Scheduling lifecycle (schedule_db)

- `SCHEDULES` carry a `STATUS` (`DRAFT` / `PUBLISHED`) and `PUBLISHED_AT`. New schedules default to `DRAFT`.
- Teacher/student read endpoints return **PUBLISHED only**; the Principal sees everything.
- Publishing snapshots the current published timetable into `SCHEDULE_VERSIONS` + `SCHEDULE_VERSION_ENTRIES` (immutable history).

---

## Kafka Event Flow

```
user-service ──► student-created, teacher-created, parent-created
                   ├──► auth-service (creates matching auth user + role)
                   └──► reporting-service

course-enrollment-service ──► enrollment-created, enrollment-cancelled
                   ├──► payment-service (updates ENROLLMENT_CACHE)
                   └──► reporting-service

attendance-service ──► attendance-recorded, attendance-updated
                   ├──► reporting-service
                   └──► notification-service (absent alert)

scheduling-service ──► schedule-generated, schedule-updated
                   └──► (future consumers)

payment-service ──► fee-generated
                   ├──► reporting-service
                   └──► notification-service (fee reminder)
              ──► payment-received
                   ├──► reporting-service
                   └──► notification-service (receipt)
              ──► fee-status-updated
                   └──► reporting-service

Any service ──► notification-request
                   └──► notification-service
```

> Topic names use hyphens (e.g. `fee-generated`); see `common-library/events/KafkaTopics.java`.

---

## API Gateway Route Summary

All requests enter at `http://localhost:8080` (local) or `http://localhost:18080` (Docker).

| Path prefix | Downstream service | JWT required |
|-------------|-------------------|--------------|
| `/auth/**` | auth-service | No (login/refresh); Yes for user/role/audit admin |
| `/students/**` | user-service | Yes |
| `/teachers/**` | user-service | Yes |
| `/parents/**` | user-service | Yes |
| `/courses/**` | course-enrollment-service | Yes |
| `/classes/**` | course-enrollment-service | Yes |
| `/enrollments/**` | course-enrollment-service | Yes |
| `/attendance/**` | attendance-service | Yes |
| `/schedules/**` | scheduling-service | Yes |
| `/rooms/**` | scheduling-service | Yes |
| `/fees/**` | payment-service | Yes |
| `/payments/**` | payment-service | Yes |
| `/notifications/**` | notification-service | Yes |
| `/reports/**` | reporting-service | Yes |

---

## Role-Based Access Summary

| Role | Access |
|------|--------|
| `PRINCIPAL` | Full access: manage users/roles, teachers, students, courses, classes, enrollments, timetable (draft/publish/history/conflicts/room availability), attendance reports & corrections review, revenue/defaulters/analytics, audit logs |
| `TEACHER` | Mark student attendance; record own attendance; submit attendance corrections; view assigned students & fee status; view own schedule; manage own availability exceptions |
| `STUDENT` | View own profile, enrollments, schedule, upcoming classes, attendance, fees; make payments; view receipts |
| `PARENT` | View linked children, their attendance, upcoming classes and fees; pay children's fees; receive notifications |

---

## Frontend Architecture

- **Routing**: `react-router-dom` nested routes under role-prefixed layouts (`/principal`, `/teacher`, `/student`, `/parent`). `ProtectedRoute` enforces authentication and `requiredRole`.
- **State**: Redux Toolkit slices per domain (`auth`, `student`, `teacher`, `course`, `enrollment`, `attendance`, `correction`, `schedule`, `fee`, `payment`, `parent`, `report`, `notification`), each using `createAsyncThunk`.
- **API access**: axios client (`services/api.ts`) with a JWT request interceptor and a response normaliser (`unwrap = r => r.data?.data ?? r.data`).
- **Shared components**: `PageHeader`, `DataTable` (paginated/searchable), `LoadingSpinner`, `ConfirmDialog`, `ProtectedRoute`.

---

## Observability — Centralised Logging (ELK Stack)

All services ship structured JSON logs to a central ELK stack running inside Docker Compose.

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `elasticsearch` | `elasticsearch:8.14.0` | 9200 | Log storage and full-text search |
| `logstash` | `logstash:8.14.0` | 5000 (TCP) | Receives JSON from services, indexes to Elasticsearch |
| `kibana` | `kibana:8.14.0` | 5601 | UI — search, filter, and visualise logs |

### How it works

1. Each service uses `logback-spring.xml` (from `common-library`) with two appenders:
   - **Local/dev profile** — plain text to stdout.
   - **Docker profile** — JSON to stdout AND JSON over TCP to `logstash:5000`.
2. Logstash writes events to the daily index `artacademy-logs-YYYY.MM.dd`.
3. Every log line carries a `service` field (`${spring.application.name}`) for filtering.

### Useful Kibana filters

| Goal | KQL query |
|------|-----------|
| Logs from one service | `service: "auth-service"` |
| All errors | `level: "ERROR"` |
| Errors from payment-service | `service: "payment-service" AND level: "ERROR"` |
| Logs containing a keyword | `message: "fee-generated"` |

---

## Related Documents

- **[README.md](README.md)** — build & run instructions (Docker, manual, Kubernetes), seeded test accounts.
- **[PRD.md](PRD.md)** — product requirements and functional feature catalogue by role.
- **[TESTING.md](TESTING.md)** — UI test scenarios per role and feature.
- **[TODO.md](TODO.md)** — remaining backlog.
- Each service folder also contains its own `DESIGN.md` with endpoint-level detail.
