# Art Academy Management Platform

A microservices platform for running an art academy: user & role management, course catalog, enrollments, timetables, exams, attendance, fee/payment lifecycle, notifications, and reporting. Role-based portals for Principal, Teacher, and Student.

## Tech Stack

- **Backend:** Java 21, Spring Boot 3.3.4, Spring Cloud 2023.0.3
- **Data:** PostgreSQL (Flyway migrations), Redis (rate limiting), Kafka (event streaming)
- **Frontend:** React 18, TypeScript, Material UI v5, Redux Toolkit
- **Infra:** Docker Compose, Eureka service discovery, Spring Cloud Config, ELK (Elasticsearch / Logstash / Kibana)
- **Build:** Maven (multi-module reactor)

## Architecture

Root multi-module Maven POM. Shared code (JWT utilities, exception handling, `ApiResponse`, Kafka event classes and topic constants) lives in `common-library`. The config server serves per-service YAML from `native` profile files; every service registers with Eureka and routes through the API gateway.

### Services

| Module | Port | Database | Responsibility |
|---|---|---|---|
| `service-registry` | 8761 | – | Eureka service discovery |
| `config-server` | 8888 | – | Centralized configuration |
| `api-gateway` | 8080 (host 18080) | – | Routing, CORS, JWT auth filter, rate limiting |
| `auth-service` | 8081 | `auth_db` | Login, JWT issuance, credentials |
| `course-enrollment-service` | 8083 | `academic_db` | Courses, enrollments, timetables, exams, **users/profiles, attendance, fees/payments** |
| `notification-service` | 8087 | `notification_db` | Event-driven notifications |
| `reporting-service` | 8088 | `reporting_db` | Event-driven materialized reporting views |
| `frontend-react` | 3000 | – | Role-based web portals |

**Note:** `course-enrollment-service` is a consolidated service. The former `user-service`, `attendance-service`, and `payment-service` were merged into it — their tables all live in `academic_db`, and their code is namespaced under `com.artacademy.courseenrollment.{user,attendance,payment}`. Cross-service calls that were once Kafka/HTTP are now direct in-process method calls; outbound Kafka producer events are retained because `reporting-service` and `notification-service` still consume them.

## Getting Started

### Prerequisites

- Java 21
- Maven 3.9+
- Docker & Docker Compose
- Node.js 18+ (for frontend development)

### Build

From the repository root:

```bash
mvn clean package -DskipTests
```

### Run (Docker Compose)

The backend containers bind-mount the built jars, so build first, then bring the stack up:

```bash
cd docker
docker compose up -d
```

To rebuild the database schema from scratch (Flyway re-applies all migrations to a fresh `academic_db`):

```bash
docker compose down -v && docker compose up -d
```

> After running `mvn install`, restart the affected container (e.g. `docker restart artacademy-course-enrollment-service`) — bind-mounted jars are loaded at JVM start, so a rebuild alone does not reload running services.

### Access

- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:18080
- **Eureka dashboard:** http://localhost:8761
- **Kibana:** http://localhost:5601

The frontend targets the gateway via `REACT_APP_API_URL` (`http://localhost:18080`, set in `frontend-react/.env`).

## Frontend Development

```bash
cd frontend-react
npm install
npm start      # dev server on :3000
npm run build  # production build
npm test       # tests
```

## Data & Migrations

Each service owns its database and uses Flyway (`classpath:db/migration`) with `ddl-auto: validate`. The consolidated `academic_db` schema — academic, user, attendance, and payment tables plus reference data and the bootstrap admin seed — is a single migration in `course-enrollment-service/src/main/resources/db/migration/`.

PostgreSQL credentials (local): user `artacademy` / password `artacademy123`.
