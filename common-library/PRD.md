# Common Library — Product Requirements Document

## Purpose

`common-library` provides the shared, cross-cutting contracts and infrastructure that every Art Academy microservice depends on, so that security, API responses, error handling, event messaging, and logging behave **identically** across the platform. It is a JAR dependency, not a runnable service — there is no server port and no database.

## Scope

**In scope:**
- Kafka event DTOs and the canonical topic-name constants (`KafkaTopics`).
- JWT token generation, validation, and claim extraction (`JwtUtil`).
- A stateless bearer-token authentication filter (`JwtAuthenticationFilter`).
- Spring Boot auto-configuration wiring the security beans and global exception handler into consuming services.
- A uniform API response envelope (`ApiResponse<T>`).
- A global exception model (`ApiException` + `GlobalExceptionHandler`).
- Centralised Logback configuration (`logback-spring.xml`) for console and Logstash output.

**Out of scope:**
- Any business logic, persistence, REST controllers, or standalone runtime. No HTTP endpoints are exposed by this module.
- Kafka broker/topic provisioning (owned by infrastructure/Docker).

## Functional Requirements

| ID | Requirement |
|----|-------------|
| LIB-01 | Provide shared Kafka event DTOs (`StudentCreatedEvent`, `TeacherCreatedEvent`, `ParentCreatedEvent`, `EnrollmentCreatedEvent`, `EnrollmentCancelledEvent`, `AttendanceRecordedEvent`, `AttendanceUpdatedEvent`, `FeeGeneratedEvent`, `FeeStatusUpdatedEvent`, `PaymentReceivedEvent`, `TimetableGeneratedEvent`, `NotificationRequestEvent`) as a single source of truth for producers and consumers. |
| LIB-02 | Provide canonical Kafka topic-name constants in `KafkaTopics` so no service hard-codes topic strings. |
| LIB-03 | Provide `JwtUtil` to generate signed JWTs (subject + roles claim, configurable expiry) and validate/parse tokens, returning `false` for expired, tampered, or malformed tokens. |
| LIB-04 | Provide `JwtAuthenticationFilter` that extracts a `Bearer` token, validates it, and populates the `SecurityContext` with the username and `ROLE_`-prefixed authorities. |
| LIB-05 | Provide `CommonSecurityAutoConfiguration` that auto-registers `JwtUtil`, `JwtAuthenticationFilter`, and `GlobalExceptionHandler` beans (each `@ConditionalOnMissingBean`) into any dependent service, registered via `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. |
| LIB-06 | Provide `ApiResponse<T>` as the uniform response envelope (`success`, `message`, `data`) with `success(...)` and `error(...)` factory helpers. |
| LIB-07 | Provide `ApiException` (with `notFound`/`badRequest`/`forbidden`/`conflict` factories) and `GlobalExceptionHandler` (`@RestControllerAdvice`) mapping exceptions to `ApiResponse.error(...)` bodies with correct HTTP status (404/400/403/409, validation → 400, catch-all → 500). |
| LIB-08 | Provide a centralised `logback-spring.xml`: console output on the default profile; console + JSON-over-TCP to Logstash (`${LOGSTASH_HOST:-localhost}:5000`) under the `docker` profile, tagging each line with `service = spring.application.name`. |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Consistency** — every service that depends on the library produces identical response envelopes, error formats, JWT handling, and log structure. |
| NFR-02 | **Backwards compatibility** — event DTO fields and topic constants form a wire contract; changes must remain compatible or be coordinated across all producers/consumers (see the Dependencies section). |
| NFR-03 | **Zero-config integration** — auto-configuration wires beans automatically; a consuming service only supplies `app.jwt.secret` (and optionally `app.jwt.expiration-ms`). |
| NFR-04 | **Non-intrusive logging** — Logstash appender buffers/reconnects (5s delay) rather than blocking the application if Logstash is unavailable. |
| NFR-05 | **Statelessness** — JWT validation is self-contained (signature + expiry); no session or shared store is required. |

## Dependencies

- **Consumed by all services:** api-gateway, auth-service, user-service, course-enrollment-service, attendance-service, payment-service, timetable-service, notification-service, reporting-service (and any future service). The library is on the classpath of every deployable module.
- **Third-party:** Spring Boot 3.3.4 (web, security), Spring Kafka, JJWT (`jjwt-api`/`jjwt-impl`/`jjwt-jackson`), `logstash-logback-encoder`, Lombok, on Java 21.
- **Contract coupling:** producers and consumers must agree on the event DTO shape and topic string for every `KafkaTopics` constant. Note the `TIMETABLE_UPDATED` topic reuses the `TimetableGeneratedEvent` DTO; there is no separate `TimetableUpdatedEvent` class.
