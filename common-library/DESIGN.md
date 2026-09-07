# Common Library — Detail Design Document

## 1. Overview

The `common-library` is a shared Maven artifact (`com.artacademy:common-library:1.0.0-SNAPSHOT`) that all business microservices depend on. It provides the cross-cutting concerns that must behave consistently across every service: JWT security, standard API response envelopes, exception handling, and the Kafka event contracts that wire services together.

No microservice should re-implement any of these concerns; all changes flow from this single module.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| GroupId | `com.artacademy` |
| ArtifactId | `common-library` |
| Package root | `com.artacademy.common` |
| Java version | 21 |
| Spring Boot | 3.3.4 |

---

## 3. Package Structure

```
com.artacademy.common
├── dto
│   └── ApiResponse.java
├── exception
│   ├── ApiException.java
│   └── GlobalExceptionHandler.java
├── events
│   ├── KafkaTopics.java
│   ├── StudentCreatedEvent.java
│   ├── TeacherCreatedEvent.java
│   ├── EnrollmentCreatedEvent.java
│   ├── EnrollmentCancelledEvent.java
│   ├── AttendanceRecordedEvent.java
│   ├── ScheduleGeneratedEvent.java
│   ├── FeeGeneratedEvent.java
│   ├── FeeStatusUpdatedEvent.java
│   ├── PaymentReceivedEvent.java
│   └── NotificationRequestEvent.java
└── security
    ├── CommonSecurityAutoConfiguration.java
    ├── JwtAuthenticationFilter.java
    └── JwtUtil.java
```

---

## 4. API Response Envelope

### `ApiResponse<T>`

All REST endpoints in the platform wrap their payloads in this generic envelope to guarantee a consistent response contract.

```java
public class ApiResponse<T> {
    boolean success;
    String  message;
    T       data;
}
```

| Static Factory | Returns |
|----------------|---------|
| `ApiResponse.success(data)` | `{ success: true, message: null, data: <data> }` |
| `ApiResponse.success(message, data)` | `{ success: true, message: <msg>, data: <data> }` |
| `ApiResponse.error(message)` | `{ success: false, message: <msg>, data: null }` |

---

## 5. Exception Model

### `ApiException`

A checked runtime exception that carries an `HttpStatus` so the global handler can translate it directly to an HTTP response.

| Factory method | HTTP status |
|----------------|-------------|
| `ApiException.notFound(message)` | 404 Not Found |
| `ApiException.badRequest(message)` | 400 Bad Request |
| `ApiException.forbidden(message)` | 403 Forbidden |
| `ApiException.conflict(message)` | 409 Conflict |

### `GlobalExceptionHandler`

`@RestControllerAdvice` registered in all services via Spring Boot auto-configuration.

| Exception caught | HTTP status | Response body |
|------------------|-------------|---------------|
| `ApiException` | status from exception | `ApiResponse.error(e.getMessage())` |
| `MethodArgumentNotValidException` | 400 | `ApiResponse.error(field errors joined)` |
| `Exception` (catch-all) | 500 | `ApiResponse.error("Internal server error")` |

---

## 6. Security Components

### 6.1 `JwtUtil`

Encapsulates all JWT operations using the JJWT library (v0.12.6) with HS256 signing.

| Method | Description |
|--------|-------------|
| `generateToken(username, roles)` | Creates a signed JWT; embeds `roles` as a claim |
| `validateToken(token)` | Returns `true` if signature is valid and token is not expired |
| `extractUsername(token)` | Reads `sub` claim |
| `extractRoles(token)` | Reads `roles` claim as `List<String>` |
| `extractClaim(token, resolver)` | Generic claim extractor |

JWT secret is injected via `${jwt.secret}` from the Config Server. Token expiry is configured per-service.

### 6.2 `JwtAuthenticationFilter`

Extends `OncePerRequestFilter`. Runs on every inbound HTTP request at the service level (behind the gateway's own filter).

**Filter flow:**
1. Read `Authorization: Bearer <token>` header.
2. If absent, pass the request through (Spring Security will reject it if the path is protected).
3. Call `JwtUtil.validateToken(token)`.
4. Extract username and roles.
5. Build `UsernamePasswordAuthenticationToken` with roles as `GrantedAuthority` list.
6. Set it on `SecurityContextHolder`.

### 6.3 `CommonSecurityAutoConfiguration`

Spring Boot auto-configuration class (`META-INF/spring/...factories`) that registers `JwtAuthenticationFilter` and `GlobalExceptionHandler` beans automatically in every dependent service.

---

## 7. Kafka Event Contracts

### 7.1 Topic Constants — `KafkaTopics`

```
STUDENT_CREATED        = "student.created"
TEACHER_CREATED        = "teacher.created"
ENROLLMENT_CREATED     = "enrollment.created"
ENROLLMENT_CANCELLED   = "enrollment.cancelled"
ATTENDANCE_RECORDED    = "attendance.recorded"
ATTENDANCE_UPDATED     = "attendance.updated"
FEE_GENERATED          = "fee.generated"
FEE_STATUS_UPDATED     = "fee.status.updated"
PAYMENT_RECEIVED       = "payment.received"
SCHEDULE_GENERATED     = "schedule.generated"
SCHEDULE_UPDATED       = "schedule.updated"
NOTIFICATION_REQUEST   = "notification.request"
```

### 7.2 Event Schemas

All events use Lombok `@Builder` and carry an `occurredAt` (`Instant`) timestamp.

#### `StudentCreatedEvent`
| Field | Type |
|-------|------|
| studentId | UUID |
| firstName | String |
| lastName | String |
| email | String |
| occurredAt | Instant |

#### `TeacherCreatedEvent`
| Field | Type |
|-------|------|
| teacherId | UUID |
| employeeCode | String |
| firstName | String |
| lastName | String |
| email | String |
| occurredAt | Instant |

#### `EnrollmentCreatedEvent`
| Field | Type |
|-------|------|
| enrollmentId | UUID |
| studentId | UUID |
| courseId | UUID |
| classId | UUID |
| occurredAt | Instant |

#### `EnrollmentCancelledEvent`
| Field | Type |
|-------|------|
| enrollmentId | UUID |
| studentId | UUID |
| courseId | UUID |
| occurredAt | Instant |

#### `AttendanceRecordedEvent`
| Field | Type | Notes |
|-------|------|-------|
| attendanceType | String | `"STUDENT"` or `"TEACHER"` |
| subjectId | UUID | studentId or teacherId |
| status | String | `AttendanceStatus` value |
| attendanceDate | LocalDate | |
| occurredAt | Instant | |

#### `ScheduleGeneratedEvent`
| Field | Type |
|-------|------|
| scheduleId | UUID |
| classId | UUID |
| teacherId | UUID |
| roomId | UUID |
| dayOfWeek | String |
| startTime | String |
| endTime | String |
| occurredAt | Instant |

#### `FeeGeneratedEvent`
| Field | Type |
|-------|------|
| feeCycleId | UUID |
| studentId | UUID |
| billingMonth | Integer |
| billingYear | Integer |
| totalAmount | BigDecimal |
| occurredAt | Instant |

#### `FeeStatusUpdatedEvent`
| Field | Type |
|-------|------|
| feeCycleId | UUID |
| studentId | UUID |
| status | String |
| occurredAt | Instant |

#### `PaymentReceivedEvent`
| Field | Type |
|-------|------|
| paymentId | UUID |
| feeCycleId | UUID |
| studentId | UUID |
| amount | BigDecimal |
| occurredAt | Instant |

#### `NotificationRequestEvent`
| Field | Type | Notes |
|-------|------|-------|
| recipientEmail | String | |
| recipientPhone | String | |
| subject | String | |
| body | String | |
| channel | String | `EMAIL`, `SMS`, or `BOTH` |
| occurredAt | Instant | |

---

## 8. Event Flow Diagram

```
user-service          ──► student.created       ──► reporting-service
                      ──► teacher.created        ──► reporting-service

course-enrollment     ──► enrollment.created     ──► payment-service (cache)
                      │                          ──► reporting-service
                      ──► enrollment.cancelled   ──► payment-service (cache)
                                                 ──► reporting-service

attendance-service    ──► attendance.recorded    ──► reporting-service
                                                 ──► notification-service

scheduling-service    ──► schedule.generated     ──► (future consumers)
                      ──► schedule.updated       ──► (future consumers)

payment-service       ──► fee.generated          ──► reporting-service
                      │                          ──► notification-service
                      ──► payment.received       ──► reporting-service
                      │                          ──► notification-service
                      ──► fee.status.updated     ──► reporting-service

Any service           ──► notification.request   ──► notification-service
```

---

## 9. Dependencies

```xml
<dependencies>
  <dependency>spring-boot-starter-web</dependency>
  <dependency>spring-boot-starter-security</dependency>
  <dependency>spring-kafka</dependency>
  <dependency>jjwt-api (v0.12.6)</dependency>
  <dependency>jjwt-impl (v0.12.6)</dependency>
  <dependency>jjwt-jackson (v0.12.6)</dependency>
  <dependency>lombok (v1.18.34)</dependency>
</dependencies>
```
