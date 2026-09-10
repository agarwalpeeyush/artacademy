# Config Server — Product Requirements Document

## Purpose

Provide a single, centralized source of configuration for every microservice in
the Art Academy platform. Services fetch their runtime settings (port,
datasource, JPA, Flyway, plus shared JWT / Kafka / Eureka defaults) from the
Config Server at startup, so that environment-specific properties live in one
place instead of being duplicated across service JARs.

## Scope

**In scope**

- Serve per-service configuration documents from a classpath `native` backend.
- Serve shared cross-cutting defaults to all services (JWT, Kafka, Eureka, actuator).
- Gate development seed data loading behind the `docker` Spring profile.
- Expose Spring Cloud Config HTTP endpoints (`/{application}/{profile}`).
- Register itself with Eureka using the shared client defaults.

**Out of scope**

- Git-backed or Vault-backed configuration (uses `native`/classpath only).
- Runtime secret encryption/decryption (secrets are plain in the served files).
- API Gateway configuration — the gateway is **not** a config client (there is no
  `api-gateway.yml`).
- Config change push/auto-refresh to clients (a `refresh` actuator endpoint is
  exposed on the server itself but there is no bus broadcast).

## Functional Requirements

| ID | Requirement |
|----|-------------|
| CFG-1 | The server SHALL run as a Spring Cloud Config Server (`@EnableConfigServer`) on port **8888**. |
| CFG-2 | The server SHALL use the `native` profile with backend `search-locations: classpath:/config`. |
| CFG-3 | The server SHALL serve shared defaults from `config/application.yml` (JWT secret + expirations, Eureka client, Kafka bootstrap/serializers, actuator exposure) to every client as the base layer. |
| CFG-4 | The server SHALL serve one configuration document per business service: auth (8081/auth_db), user (8082/user_db), course-enrollment (8083/academic_db), attendance (8084/attendance_db), timetable (8085/timetable_db), payment (8086/payment_db), notification (8087/notification_db), reporting (8088/reporting_db). |
| CFG-5 | Each per-service document SHALL define `server.port`, `spring.application.name`, a PostgreSQL datasource (`jdbc:postgresql://localhost:15432/<db>`, user `artacademy` / pass `artacademy123`), `jpa.hibernate.ddl-auto: validate`, and `flyway.locations: classpath:db/migration`. |
| CFG-6 | The six seeded services (auth, user, course-enrollment, attendance, timetable, payment) SHALL each include a `docker`-profile document that overrides `flyway.locations` to `classpath:db/migration,classpath:db/seed`. |
| CFG-7 | notification-service and reporting-service SHALL be schema-only: no `docker`-profile document, Flyway locations always `classpath:db/migration`. |
| CFG-8 | The server SHALL expose `/{service}/default` and `/{service}/docker` endpoints returning the merged property sources for that service and profile. |
| CFG-9 | Client services SHALL consume config via `spring.config.import: optional:configserver:http://localhost:8888`; the `optional:` prefix allows a client to boot when the server is down. |
| CFG-10 | The server SHALL register with Eureka at `http://localhost:8761/eureka/` using the shared client defaults it serves. |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| CFG-NFR-1 | Stateless — configuration is read from the classpath; the server holds no client state. |
| CFG-NFR-2 | Fast startup and low footprint; the module contains only the bootstrap class plus config files. |
| CFG-NFR-3 | Actuator `health`, `info`, `refresh` endpoints exposed for liveness and manual refresh. |
| CFG-NFR-4 | Configuration is version-controlled with the source tree (bundled on the classpath), giving auditability and reproducible builds. |
| CFG-NFR-5 | Seed data must never load outside the `docker` profile (production/default safety). |

## Dependencies

| Dependency | Role |
|------------|------|
| Spring Cloud Config Server | Serves the `/{application}/{profile}` endpoints. |
| Spring Boot Actuator | Health/info/refresh endpoints. |
| Eureka / Service Registry (`localhost:8761`) | The server registers itself; served defaults point clients here. |
| Client services | Import config at startup via `spring.config.import`. |
| PostgreSQL (`localhost:15432`) | Target of the datasource config served to clients (not used by the server itself). |
| Kafka (`localhost:19092`) | Bootstrap value in shared defaults, used by event-driven clients at runtime. |
