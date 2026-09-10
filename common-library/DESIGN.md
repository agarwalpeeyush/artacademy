# Common Library — Detail Design Document

## 1. Overview

`common-library` is a **shared, cross-cutting library** for the Art Academy microservices platform. It is **not a deployable service**: it has no HTTP server port, no database, and no runnable `main` class. It is packaged as a plain JAR and added as a compile dependency to every Spring Boot service in the platform.

It centralises the contracts and infrastructure concerns that must be identical across all services:

- **Kafka event DTOs and topic-name constants** — the shared messaging contract between producers and consumers.
- **JWT utilities and a stateless authentication filter** — so every service validates bearer tokens the same way.
- **A uniform API response envelope and error-handling contract** — so all REST endpoints return a consistent shape.
- **A Spring Boot auto-configuration** — that wires the security beans and global exception handler into any service on the classpath, with zero per-service configuration.
- **A shared Logback configuration** — console logging for local dev, plus JSON-over-TCP to Logstash under the `docker` profile.

Because it is consumed by every service, changes to its event DTOs or topic constants are effectively breaking changes to the whole platform and must be coordinated.

- Spring Boot 3.3.4, Java 21.
- DTOs use Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`).

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| GroupId | `com.artacademy` (inherited from parent `artacademy-platform`) |
| ArtifactId | `common-library` |
| Version | `1.0.0-SNAPSHOT` (inherited from parent) |
| Packaging | `jar` |
| Package root | `com.artacademy.common` |
| Server port | none (not a service) |
| Database | none |
| Java / Spring Boot | 21 / 3.3.4 |
| Key dependencies | `spring-boot-starter-web`, `spring-boot-starter-security`, `spring-kafka`, `jjwt-api` / `jjwt-impl` / `jjwt-jackson`, `logstash-logback-encoder`, `lombok` (optional) |

## 3. Component Structure

Package tree from the actual source (`src/main/java` + `src/main/resources`):

```
com.artacademy.common
├── events/                              (Kafka contract: DTOs + topic constants)
│   ├── KafkaTopics.java                 final class of String topic-name constants
│   ├── StudentCreatedEvent.java
│   ├── TeacherCreatedEvent.java
│   ├── ParentCreatedEvent.java
│   ├── EnrollmentCreatedEvent.java
│   ├── EnrollmentCancelledEvent.java
│   ├── AttendanceRecordedEvent.java
│   ├── AttendanceUpdatedEvent.java
│   ├── FeeGeneratedEvent.java
│   ├── FeeStatusUpdatedEvent.java
│   ├── PaymentReceivedEvent.java
│   ├── TimetableGeneratedEvent.java
│   └── NotificationRequestEvent.java
├── security/                            (auth wiring)
│   ├── JwtUtil.java                     token generate / validate / claim extraction
│   ├── JwtAuthenticationFilter.java     OncePerRequestFilter, sets SecurityContext
│   └── CommonSecurityAutoConfiguration.java  @AutoConfiguration beans
├── exception/                           (error contract)
│   ├── ApiException.java                RuntimeException + HttpStatus factories
│   └── GlobalExceptionHandler.java      @RestControllerAdvice
└── dto/                                 (shared response envelope)
    └── ApiResponse.java                 ApiResponse<T>

src/main/resources
├── logback-spring.xml                   CONSOLE + LOGSTASH appenders, profile-selected
└── META-INF/spring/
    └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
                                         registers CommonSecurityAutoConfiguration
```

> Note: there is **no** standalone `util/` or `config/` package in the current source. The JWT helper (`JwtUtil`) resides in `security/`, and the auto-configuration class also lives in `security/`. Twelve event DTO classes plus `KafkaTopics` make up `events/`.

## 4. Kafka Event Catalogue

The table maps each `KafkaTopics` constant to its exact topic string, the event DTO serialized onto it, the producing service, and the consuming service(s). Producer/consumer mapping is derived from actual `@KafkaListener` / `kafkaTemplate.send(...)` usages across the platform.

| Constant | Topic string | Event DTO | Producer | Consumer(s) |
|----------|--------------|-----------|----------|-------------|
| `STUDENT_CREATED` | `student-created` | `StudentCreatedEvent` | user-service | auth-service, reporting-service |
| `TEACHER_CREATED` | `teacher-created` | `TeacherCreatedEvent` | user-service | auth-service, reporting-service |
| `PARENT_CREATED` | `parent-created` | `ParentCreatedEvent` | user-service | auth-service |
| `ENROLLMENT_CREATED` | `enrollment-created` | `EnrollmentCreatedEvent` | course-enrollment-service | payment-service, reporting-service |
| `ENROLLMENT_CANCELLED` | `enrollment-cancelled` | `EnrollmentCancelledEvent` | course-enrollment-service | payment-service, reporting-service |
| `ATTENDANCE_RECORDED` | `attendance-recorded` | `AttendanceRecordedEvent` | attendance-service | notification-service, reporting-service |
| `ATTENDANCE_UPDATED` | `attendance-updated` | `AttendanceUpdatedEvent` | attendance-service | reporting-service |
| `FEE_GENERATED` | `fee-generated` | `FeeGeneratedEvent` | payment-service | notification-service, reporting-service |
| `PAYMENT_RECEIVED` | `payment-received` | `PaymentReceivedEvent` | payment-service | notification-service, reporting-service |
| `FEE_STATUS_UPDATED` | `fee-status-updated` | `FeeStatusUpdatedEvent` | payment-service | (no active consumer found) |
| `TIMETABLE_GENERATED` | `timetable-generated` | `TimetableGeneratedEvent` | timetable-service | (no active consumer found) |
| `TIMETABLE_UPDATED` | `timetable-updated` | `TimetableGeneratedEvent` * | timetable-service | (no active consumer found) |
| `NOTIFICATION_REQUEST` | `notification-request` | `NotificationRequestEvent` | auth-service (and other requesters) | notification-service |

> \* **Discrepancy:** there is **no `TimetableUpdatedEvent` class**. The `TIMETABLE_UPDATED` topic constant exists and timetable-service publishes to it, but the payload it sends is a `TimetableGeneratedEvent`. Only 12 event DTO classes exist (see §5), against 13 topic constants.

## 5. Event DTO Fields

Every event DTO is a Lombok POJO annotated `@Data @Builder @NoArgsConstructor @AllArgsConstructor`. Fields below are read directly from source.

### StudentCreatedEvent
| Field | Type | Notes |
|-------|------|-------|
| studentId | `UUID` | |
| username | `String` | |
| email | `String` | |
| temporaryPassword | `String` | |
| firstName | `String` | |
| lastName | `String` | |
| roles | `List<String>` | Auth roles; defaults to `["STUDENT"]` if not supplied |
| occurredAt | `Instant` | |

### TeacherCreatedEvent
| Field | Type | Notes |
|-------|------|-------|
| teacherId | `UUID` | |
| username | `String` | |
| email | `String` | |
| temporaryPassword | `String` | |
| employeeCode | `String` | |
| firstName | `String` | |
| lastName | `String` | |
| roles | `List<String>` | Defaults to `["TEACHER"]` if not supplied |
| occurredAt | `Instant` | |

### ParentCreatedEvent
| Field | Type | Notes |
|-------|------|-------|
| parentId | `UUID` | |
| username | `String` | |
| email | `String` | |
| temporaryPassword | `String` | |
| firstName | `String` | |
| lastName | `String` | |
| roles | `List<String>` | Defaults to `["PARENT"]` if not supplied |
| occurredAt | `Instant` | |

### EnrollmentCreatedEvent
| Field | Type |
|-------|------|
| enrollmentId | `UUID` |
| studentId | `UUID` |
| courseId | `UUID` |
| classId | `UUID` |
| occurredAt | `Instant` |

### EnrollmentCancelledEvent
| Field | Type |
|-------|------|
| enrollmentId | `UUID` |
| studentId | `UUID` |
| courseId | `UUID` |
| occurredAt | `Instant` |

### AttendanceRecordedEvent
| Field | Type | Notes |
|-------|------|-------|
| attendanceType | `String` | `STUDENT` or `TEACHER` |
| subjectId | `UUID` | studentId or teacherId |
| status | `String` | |
| attendanceDate | `String` | |
| courseId | `UUID` | |
| courseName | `String` | |
| occurredAt | `Instant` | |

### AttendanceUpdatedEvent
| Field | Type | Notes |
|-------|------|-------|
| attendanceType | `String` | `STUDENT` or `TEACHER` |
| subjectId | `UUID` | studentId or teacherId |
| oldStatus | `String` | |
| newStatus | `String` | |
| attendanceDate | `String` | |
| courseId | `UUID` | |
| courseName | `String` | |
| occurredAt | `Instant` | |

### FeeGeneratedEvent
| Field | Type |
|-------|------|
| feeCycleId | `UUID` |
| studentId | `UUID` |
| billingMonth | `Integer` |
| billingYear | `Integer` |
| totalAmount | `BigDecimal` |
| occurredAt | `Instant` |

### FeeStatusUpdatedEvent
| Field | Type |
|-------|------|
| feeCycleId | `UUID` |
| studentId | `UUID` |
| status | `String` |
| occurredAt | `Instant` |

### PaymentReceivedEvent
| Field | Type |
|-------|------|
| paymentId | `UUID` |
| feeCycleId | `UUID` |
| studentId | `UUID` |
| amount | `BigDecimal` |
| occurredAt | `Instant` |

### TimetableGeneratedEvent
| Field | Type |
|-------|------|
| timetableId | `UUID` |
| classId | `UUID` |
| teacherId | `UUID` |
| roomId | `UUID` |
| dayOfWeek | `String` |
| startTime | `String` |
| endTime | `String` |
| occurredAt | `Instant` |

### NotificationRequestEvent
| Field | Type | Notes |
|-------|------|-------|
| recipientEmail | `String` | |
| recipientPhone | `String` | |
| subject | `String` | |
| body | `String` | |
| channel | `String` | `EMAIL`, `SMS`, or `BOTH` |
| occurredAt | `Instant` | |

## 6. Security Components

### 6.1 JwtUtil (`@Component`)

Configuration is bound from properties (each service supplies these):

| Property | Default | Purpose |
|----------|---------|---------|
| `app.jwt.secret` | (required) | Base64-encoded HMAC signing secret |
| `app.jwt.expiration-ms` | `900000` (15 min) | Token lifetime in ms |

The signing key is built via `Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))`.

| Method | Signature | Behaviour |
|--------|-----------|-----------|
| `generateToken` | `String generateToken(String username, List<String> roles)` | Builds a signed JWT with `subject = username`, a `roles` claim, `issuedAt = now`, and `expiration = now + expirationMs`. |
| `validateToken` | `boolean validateToken(String token)` | Parses & verifies the signature; returns `false` on any `JwtException` or `IllegalArgumentException` (covers expired, tampered, and malformed tokens). |
| `extractUsername` | `String extractUsername(String token)` | Returns the `subject` claim. |
| `extractRoles` | `List<String> extractRoles(String token)` | Returns the `roles` claim as a `List<String>`. |
| `extractClaim` | `<T> T extractClaim(String token, Function<Claims,T> resolver)` | Generic claim resolver over verified claims. |

### 6.2 JwtAuthenticationFilter (extends `OncePerRequestFilter`)

Constructed with a `JwtUtil` (`@RequiredArgsConstructor`). Flow per request:

1. `resolveToken(request)` reads the `Authorization` header; if it has text and starts with `Bearer `, strips the 7-char prefix and returns the raw token, else `null`.
2. If a token is present **and** `jwtUtil.validateToken(token)` is `true`:
   - `username = extractUsername(token)`
   - `roles = extractRoles(token)`
   - Each role is mapped to a `SimpleGrantedAuthority("ROLE_" + role)`.
   - A `UsernamePasswordAuthenticationToken(username, null, authorities)` is set on `SecurityContextHolder`.
3. Always calls `filterChain.doFilter(...)` afterwards. The filter itself never writes a 401 — it simply does not authenticate when the token is missing/invalid, and downstream Spring Security authorization rules produce the 401/403.

### 6.3 CommonSecurityAutoConfiguration (`@AutoConfiguration`)

Declares three beans, each guarded by `@ConditionalOnMissingBean` so a service may override any of them:

| Bean | Type | Notes |
|------|------|-------|
| `jwtUtil` | `JwtUtil` | `new JwtUtil()` |
| `jwtAuthenticationFilter` | `JwtAuthenticationFilter` | injected with the `JwtUtil` bean |
| `globalExceptionHandler` | `GlobalExceptionHandler` | the shared `@RestControllerAdvice` |

**Registration:** the class is listed in
`src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`:

```
com.artacademy.common.security.CommonSecurityAutoConfiguration
```

This is the Spring Boot 3 auto-configuration mechanism (replacing the legacy `spring.factories`). Any service with `common-library` on its classpath gets these beans automatically.

## 7. Shared API Contract

### 7.1 ApiResponse&lt;T&gt; (envelope)

Lombok POJO (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`) with static factory helpers:

| Field | Type |
|-------|------|
| success | `boolean` |
| message | `String` |
| data | `T` |

```java
ApiResponse.success(data);              // success=true, data set
ApiResponse.success("message", data);   // success=true, message + data
ApiResponse.error("message");           // success=false, message set, data null
```

Serialized JSON shape:

```json
{ "success": true, "message": "Created", "data": { } }
{ "success": false, "message": "Student not found", "data": null }
```

### 7.2 ApiException + GlobalExceptionHandler

`ApiException` is a `RuntimeException` carrying an `HttpStatus` (`@Getter status`), with factory methods:

| Factory | HTTP status |
|---------|-------------|
| `ApiException.notFound(msg)` | 404 NOT_FOUND |
| `ApiException.badRequest(msg)` | 400 BAD_REQUEST |
| `ApiException.forbidden(msg)` | 403 FORBIDDEN |
| `ApiException.conflict(msg)` | 409 CONFLICT |

`GlobalExceptionHandler` (`@RestControllerAdvice`) maps exceptions to `ApiResponse.error(...)` bodies — error responses therefore share the same `ApiResponse<T>` envelope shape as successful ones (`success=false`, `data=null`):

| Handler | Triggered by | Response status | Body message |
|---------|--------------|-----------------|--------------|
| `handleApiException` | `ApiException` | `ex.getStatus()` (404/400/403/409/…) | `ex.getMessage()` |
| `handleValidation` | `MethodArgumentNotValidException` | 400 BAD_REQUEST | first field error as `"field: default message"`, else `"Validation failed"` |
| `handleGeneric` | any other `Exception` | 500 INTERNAL_SERVER_ERROR | `"Internal server error"` (full stack trace logged) |

## 8. Logging

`logback-spring.xml` defines two appenders and selects them by Spring profile.

- **`SERVICE_NAME`** — a `springProperty` sourced from `spring.application.name` (default `artacademy-service`); injected into every log line and the Logstash `service` field.

| Appender | Class | Destination / format |
|----------|-------|----------------------|
| `CONSOLE` | `ConsoleAppender` | Pattern `%d{yyyy-MM-dd HH:mm:ss.SSS} [SERVICE_NAME] [%thread] %-5level %logger{36} - %msg%n` |
| `LOGSTASH` | `LogstashTcpSocketAppender` | TCP to `${LOGSTASH_HOST:-localhost}:5000`, JSON via `LogstashEncoder`; adds custom field `service`, shortened stack traces (max depth 20, root cause first), 5s reconnection delay |

Profile selection:

| Profile | Root level | Appenders | Extra |
|---------|-----------|-----------|-------|
| `!docker` (local/default) | INFO | `CONSOLE` | — |
| `docker` | INFO | `CONSOLE` + `LOGSTASH` | Quiets `org.springframework`, `org.hibernate`, `com.netflix.eureka`, `com.netflix.discovery`, `org.apache.kafka` to WARN |

Under `docker`, console output is retained so `docker compose logs` still works, while structured JSON is streamed to Logstash for the ELK stack.
