# Art Academy Platform — Design Document

## Platform Overview

The Art Academy Platform is a microservices-based educational management system built with **Spring Boot 3.3.4** and **Spring Cloud 2023.0.3**. It manages courses, teachers, students, parents, attendance, timetabling, payments, notifications, and reporting for an art academy.

The platform follows a **database-per-service** pattern: each business service owns its own PostgreSQL schema and never reaches into another service's tables. Cross-service consistency is achieved through **Kafka events** (choreographed sagas) and lightweight read-model caches (e.g. the payment service's `ENROLLMENT_CACHE`, the reporting service's materialised projections).

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
| 3 | API Gateway | 8080 / 18080 | — | Routing, JWT validation, CORS, rate limiting |
| 4 | Auth Service | 8081 / 8081 | `auth_db` | Login, JWT issue/refresh, roles, password reset, audit log, user/role management |
| 5 | User Service | 8082 / 8082 | `user_db` | Teacher / student / parent profiles, teacher weekly availability + one-off exceptions |
| 6 | Course Enrollment Service | 8083 / 8083 | `academic_db` | Courses, classes, enrollments |
| 7 | Attendance Service | 8084 / 8084 | `attendance_db` | Student & teacher attendance, class sessions, correction workflow |
| 8 | Timetable Service | 8085 / 8085 | `timetable_db` | Rooms, weekly timetable, draft/publish workflow, room availability, upcoming classes |
| 9 | Payment Service | 8086 / 8086 | `payment_db` | Fee cycles, fee details, payments, allocations |
| 10 | Notification Service | 8087 / 8087 | `notification_db` | Email/SMS notifications, announcements, Kafka consumer |
| 11 | Reporting Service | 8088 / 8088 | `reporting_db` | Materialised summaries, revenue/attendance analytics, defaulters |
| — | Frontend (React) | 3000 / 3000 | — | Role-based SPA (Principal / Teacher / Student / Parent) |

---

## Startup Order

```
1. service-registry    (8761)  — Eureka server
2. config-server       (8888)  — registers with Eureka; serves all service config
3. api-gateway         (8080)  — imports config, discovers services
4. auth-service        (8081)  — imports config
5. user-service        (8082)  — imports config
6. course-enrollment-service (8083)
7. attendance-service  (8084)
8. timetable-service   (8085)
9. payment-service     (8086)  — needs Kafka
10. notification-service (8087) — needs Kafka + SMTP
11. reporting-service  (8088)  — needs Kafka
```

Each service runs its own Flyway migrations on startup. The base schema (`V1__init_*.sql` under `db/migration`) is always applied. Under the **`docker`/`dev` profile only**, an additional `db/seed` location is added so `V2__seed_dev_data.sql` also runs. Seed data is idempotent (`ON CONFLICT DO NOTHING`), so restarts never duplicate rows, and a clean (default-profile) start creates schema **only** — no demo data.

---

## Data Model Highlights

### Clean-slate migrations

Every service ships a **single fresh `V1__init_<name>.sql`** that reproduces the *final* schema (no historical BIGSERIAL→UUID conversions, no later ALTER/DROP steps). `ddl-auto: validate` guarantees the SQL matches the JPA entities exactly. Seeded services additionally carry a **profile-gated `V2__seed_dev_data.sql`** in a separate `db/seed` location that is only on the classpath under the `docker`/`dev` profile.

### Cross-service identity

A person has **one UUID** that is identical across every database:

- `auth_db.USERS.ID` == `user_db.USERS.ID` (and the subtype table `STUDENTS`/`TEACHERS`/`PARENTS`).
- `auth_db.USERS.USERNAME` == `user_db.USERS.LOGIN_ID`.
- That same UUID appears as `STUDENT_ID` / `TEACHER_ID` in `academic_db`, `attendance_db`, `timetable_db`, and `payment_db`.

At runtime this is enforced by the flow: user-service creates the profile and publishes a `*-created` event carrying the UUID; auth-service consumes it and persists an auth user with the **same** ID. Seed migrations hard-code matching UUIDs to reproduce this without Kafka.

**Seed UUID convention:** principal `…-0001-000000000001`; teachers `…-0002-00000000000X`; students `…-0003-00000000000X`; parents `…-0004-00000000000X`; courses `…-0c0X-…`; classes `…-0d0X-…`; enrollments `…-0e0X-…`; rooms `…-0f0X-…`; timetables `…-110X-…`; attendance `…-120X-…`; fee cycles/details/payments/allocations `…-1301/1302/1303/1304-…`.

### User inheritance (user_db)

`USERS` is the base table (JOINED inheritance) with a `USER_TYPE` discriminator. `STUDENTS`, `TEACHERS`, and `PARENTS` are child tables keyed by the same `ID`. A `PARENT` links to a `STUDENT` via `PARENTS.STUDENT_ID`.

### Timetable lifecycle (timetable_db)

- `TIMETABLES` carry a `STATUS` (`DRAFT` / `PUBLISHED`) and `PUBLISHED_AT`. New rows default to `DRAFT`.
- Teacher/student/class read endpoints return **PUBLISHED only**; the Principal (`GET /timetables`) sees everything.
- There is **no** schedule-version/history table — timetable history snapshots were removed in the clean-slate rework.

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
                   └──► notification-service (absent alert on attendance-recorded)

timetable-service ──► timetable-generated, timetable-updated
                   └──► (no active consumers today)

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

> Topic names use hyphens (e.g. `fee-generated`); the constants live in `common-library/events/KafkaTopics.java`. Topics are auto-created (`KAFKA_AUTO_CREATE_TOPICS_ENABLE=true`).

---

## API Gateway Route Summary

All requests enter at `http://localhost:8080` (local) or `http://localhost:18080` (Docker).

| Path prefix | Downstream service | JWT required |
|-------------|-------------------|--------------|
| `/auth/**` | auth-service | No filter at the gateway (auth-service enforces per-endpoint auth) |
| `/students/**` | user-service | Yes |
| `/teachers/**` | user-service | Yes |
| `/parents/**` | user-service | Yes |
| `/users/**` | user-service | Yes |
| `/courses/**` | course-enrollment-service | Yes |
| `/classes/**` | course-enrollment-service | Yes |
| `/enrollments/**` | course-enrollment-service | Yes |
| `/attendance/**` | attendance-service | Yes |
| `/timetables/**` | timetable-service | Yes |
| `/rooms/**` | timetable-service | Yes |
| `/fees/**` | payment-service | Yes |
| `/payments/**` | payment-service | Yes |
| `/notifications/**` | notification-service | Yes |
| `/reports/**` | reporting-service | Yes |

A global CORS filter applies to `/**`, and a Redis-backed request rate limiter (replenish 100 / burst 200) protects routes. Services are discovered via Eureka (`http://localhost:8761/eureka/`).

---

## Role-Based Access Summary

| Role | Access |
|------|--------|
| `PRINCIPAL` | Full access: manage users/roles, teachers, students, courses, classes, enrollments, timetable (draft/publish/room availability), attendance reports & corrections review, revenue/defaulters/analytics, announcements, audit logs |
| `TEACHER` | Mark student attendance; record own attendance; submit attendance corrections; view assigned students & fee status; view own timetable; manage own availability exceptions; send announcements when granted broadcast permission |
| `STUDENT` | View own profile, enrollments, timetable, upcoming classes, attendance, fees; make payments; view receipts; view notifications |
| `PARENT` | View linked children, their attendance, upcoming classes and fees; pay children's fees; receive notifications |

---

## Frontend Architecture

- **Routing**: `react-router-dom` nested routes under role-prefixed layouts (`/principal`, `/teacher`, `/student`, `/parent`). `ProtectedRoute` enforces authentication and `requiredRole`.
- **State**: Redux Toolkit slices per domain (`auth`, `announcement`, `attendance`, `correction`, `course`, `enrollment`, `fee`, `notification`, `payment`, `parent`, `report`, `student`, `teacher`, `timetable`), each using `createAsyncThunk`.
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
   - **Non-docker profile** — plain text to stdout (CONSOLE).
   - **Docker profile** — CONSOLE plus JSON over TCP to `logstash:5000` (LOGSTASH).
2. Logstash writes events to a daily `artacademy-logs-YYYY.MM.dd` index.
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
- Each service folder also contains its own `DESIGN.md`, `PRD.md`, and `testing.md` with endpoint-level detail.
