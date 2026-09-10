# Notification Service — Detail Design Document

## 1. Overview

The **Notification Service** is the messaging hub of the Art Academy platform. It has
two responsibilities:

1. **Delivery notifications** — persist and (optionally) deliver messages to individual
   users over email/SMS channels. Notifications are created either directly through the
   REST API (by a Principal) or, more commonly, in reaction to domain events published on
   Kafka by other services (fee generated, payment received, student absence, or a generic
   notification request).
2. **In-app notification centre & announcements** — every user has an inbox that tracks
   read/unread state, and Principals (plus permitted Teachers) can broadcast announcements
   that fan out to one inbox notification per targeted recipient.

The service is a **pure Kafka consumer** (it publishes no events) and is **schema-only**:
its Flyway migration creates tables but seeds no data — all rows are produced at runtime.

Email delivery uses Spring's `JavaMailSender` against Gmail SMTP. SMS has no provider
integrated; SMS-only notifications are marked `SENT` immediately without transmission.

## 2. Module Coordinates

| Property            | Value                                                        |
|---------------------|--------------------------------------------------------------|
| Service name        | `notification-service`                                       |
| HTTP port           | `8087`                                                        |
| Package root        | `com.artacademy.notification`                                |
| Database            | `notification_db` (PostgreSQL, JDBC `localhost:15432`)       |
| Migration tool      | Flyway (`classpath:db/migration`)                            |
| JPA `ddl-auto`      | `validate`                                                   |
| Spring Boot / Java  | Spring Boot 3.3.4 / Java 21                                  |
| Config source       | Config Server (`optional:configserver:http://localhost:8888`)|
| Mail transport      | Gmail SMTP (`smtp.gmail.com:587`, STARTTLS)                  |
| Kafka role          | Consumer only (no producers)                                 |
| Security            | Stateless JWT (`JwtAuthenticationFilter` from common-library)|

## 3. Component Structure

Package tree as it exists in `src/main/java`:

```
com.artacademy.notification
├── NotificationServiceApplication.java      // @SpringBootApplication entry point
├── config
│   ├── KafkaConsumerConfig.java             // consumer factory, JSON deserializer, concurrency=3
│   └── SecurityConfig.java                  // stateless JWT chain + per-endpoint authorization
├── controller
│   ├── NotificationController.java          // /notifications
│   └── AnnouncementController.java          // /notifications/announcements
├── domain
│   ├── Notification.java                    // NOTIFICATIONS
│   ├── Announcement.java                    // ANNOUNCEMENTS
│   └── TeacherBroadcastPermission.java      // TEACHER_BROADCAST_PERMISSIONS
├── dto
│   ├── NotificationRequest.java
│   ├── NotificationResponse.java
│   ├── AnnouncementRequest.java
│   ├── AnnouncementResponse.java
│   └── TeacherPermissionResponse.java
├── kafka
│   └── NotificationEventConsumer.java       // 4 @KafkaListener methods
├── repository
│   ├── NotificationRepository.java
│   ├── AnnouncementRepository.java
│   └── TeacherBroadcastPermissionRepository.java
└── service
    ├── NotificationService.java             // send + read tracking + email delivery
    └── AnnouncementService.java             // broadcast fan-out + permission gate
```

## 4. Domain Model

### 4.1 `Notification` (`NOTIFICATIONS`)

| Field           | Type            | Column           | Notes                                          |
|-----------------|-----------------|------------------|------------------------------------------------|
| `id`            | `UUID`          | `ID`             | PK, `GenerationType.UUID`                       |
| `userId`        | `UUID`          | `USER_ID`        | Recipient user (nullable for pure email sends)  |
| `recipientEmail`| `String(200)`   | `RECIPIENT_EMAIL`| Email address                                   |
| `recipientPhone`| `String(20)`    | `RECIPIENT_PHONE`| Phone number                                    |
| `subject`       | `String(500)`   | `SUBJECT`        | Email subject / short heading                   |
| `title`         | `String(500)`   | `TITLE`          | In-app title (set for announcements)            |
| `type`          | `String(50)`    | `TYPE`           | e.g. `ANNOUNCEMENT`                             |
| `body`          | `TEXT`          | `BODY`           | Message body                                    |
| `isRead`        | `boolean`       | `IS_READ`        | Not null, default `false`                       |
| `readAt`        | `LocalDateTime` | `READ_AT`        | Set when marked read                            |
| `channel`       | `String(20)`    | `CHANNEL`        | Not null — `EMAIL` / `SMS` / `BOTH` / `NONE`    |
| `status`        | `String(20)`    | `STATUS`         | Not null — `PENDING` / `SENT` / `FAILED`        |
| `sentAt`        | `LocalDateTime` | `SENT_AT`        | Set on successful/immediate send                |
| `createdAt`     | `LocalDateTime` | `CREATED_AT`     | Not null, immutable (`@PrePersist`)             |
| `errorMessage`  | `TEXT`          | `ERROR_MESSAGE`  | Populated on `FAILED`                           |

`@PrePersist` defaults `createdAt` to now and `status` to `PENDING` when unset.

**Channel enum (string):** `EMAIL`, `SMS`, `BOTH`, `NONE`.
**Status enum (string):** `PENDING`, `SENT`, `FAILED`.

### 4.2 `Announcement` (`ANNOUNCEMENTS`)

| Field           | Type            | Column           | Notes                                  |
|-----------------|-----------------|------------------|----------------------------------------|
| `id`            | `UUID`          | `ID`             | PK                                     |
| `title`         | `String(500)`   | `TITLE`          | Not null                               |
| `body`          | `TEXT`          | `BODY`           | Not null                               |
| `audience`      | `String(30)`    | `AUDIENCE`       | Not null — targeting enum (below)      |
| `senderUserId`  | `UUID`          | `SENDER_USER_ID` | Author                                 |
| `senderRole`    | `String(30)`    | `SENDER_ROLE`    | e.g. `ROLE_PRINCIPAL` / `ROLE_TEACHER` |
| `recipientCount`| `int`           | `RECIPIENT_COUNT`| Not null — number of recipients fanned |
| `createdAt`     | `LocalDateTime` | `CREATED_AT`     | Not null, immutable (`@PrePersist`)    |

**Audience enum (string):** `ALL_STUDENTS`, `ALL_TEACHERS`, `TEACHER_STUDENTS`.

### 4.3 `TeacherBroadcastPermission` (`TEACHER_BROADCAST_PERMISSIONS`)

| Field         | Type            | Column         | Notes                                  |
|---------------|-----------------|----------------|----------------------------------------|
| `teacherId`   | `UUID`          | `TEACHER_ID`   | **PK** (teacher user id)               |
| `canBroadcast`| `boolean`       | `CAN_BROADCAST`| Not null                               |
| `updatedAt`   | `LocalDateTime` | `UPDATED_AT`   | Not null, set on `@PrePersist`/`@PreUpdate` |

## 5. Database Schema

Actual `V1__init_notification_schema.sql` (schema only; no seed data). Note there are no
`CHECK` constraints — channel/status/audience validity is enforced in application code, and
columns are constrained only by `NOT NULL` plus supporting indexes.

```sql
-- Notification service schema (notification_db). Filled at runtime; no seed.

CREATE TABLE NOTIFICATIONS (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_ID         UUID,
    RECIPIENT_EMAIL VARCHAR(200),
    RECIPIENT_PHONE VARCHAR(20),
    SUBJECT         VARCHAR(500),
    TITLE           VARCHAR(500),
    TYPE            VARCHAR(50),
    BODY            TEXT,
    IS_READ         BOOLEAN NOT NULL DEFAULT FALSE,
    READ_AT         TIMESTAMP,
    CHANNEL         VARCHAR(20) NOT NULL,
    STATUS          VARCHAR(20) NOT NULL,
    SENT_AT         TIMESTAMP,
    CREATED_AT      TIMESTAMP NOT NULL,
    ERROR_MESSAGE   TEXT
);

CREATE INDEX idx_notifications_user_id ON NOTIFICATIONS (USER_ID);
CREATE INDEX idx_notifications_status ON NOTIFICATIONS (STATUS);
CREATE INDEX idx_notifications_user_created ON NOTIFICATIONS (USER_ID, CREATED_AT DESC);
CREATE INDEX idx_notifications_user_read ON NOTIFICATIONS (USER_ID, IS_READ);

CREATE TABLE ANNOUNCEMENTS (
    ID              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TITLE           VARCHAR(500) NOT NULL,
    BODY            TEXT NOT NULL,
    AUDIENCE        VARCHAR(30) NOT NULL,
    SENDER_USER_ID  UUID,
    SENDER_ROLE     VARCHAR(30),
    RECIPIENT_COUNT INTEGER NOT NULL,
    CREATED_AT      TIMESTAMP NOT NULL
);

CREATE INDEX idx_announcements_created_at ON ANNOUNCEMENTS (CREATED_AT DESC);

CREATE TABLE TEACHER_BROADCAST_PERMISSIONS (
    TEACHER_ID    UUID PRIMARY KEY,
    CAN_BROADCAST BOOLEAN NOT NULL,
    UPDATED_AT    TIMESTAMP NOT NULL
);
```

## 6. REST API

All paths are relative to the service base. Through the API gateway the prefix is
`http://localhost:8080/notifications`; direct access is `http://localhost:8087`.
Authorization is enforced both by `SecurityConfig` request matchers and method-level
`@PreAuthorize`.

### 6.1 Notification endpoints

| Method | Path                          | Auth                | Description                                  |
|--------|-------------------------------|---------------------|----------------------------------------------|
| POST   | `/notifications/send`         | `ROLE_PRINCIPAL`    | Create + attempt delivery of a notification  |
| GET    | `/notifications/{userId}`     | authenticated       | Paginated inbox for a user (newest first)    |
| PUT    | `/notifications/{id}/read`    | authenticated       | Mark one notification read                   |
| PUT    | `/notifications/read-all`     | authenticated       | Mark all of a user's notifications read (`?userId=`) |
| GET    | `/notifications/unread-count` | authenticated       | Unread count for a user (`?userId=`)         |

`GET /{userId}` uses `@PageableDefault(size = 20, sort = "createdAt")`.

### 6.2 Announcement endpoints

| Method | Path                                                    | Auth                      | Description                             |
|--------|---------------------------------------------------------|---------------------------|-----------------------------------------|
| POST   | `/notifications/announcements`                          | `PRINCIPAL` or `TEACHER`* | Broadcast an announcement               |
| GET    | `/notifications/announcements`                          | `ROLE_PRINCIPAL`          | Announcement history (paginated)        |
| GET    | `/notifications/announcements/permissions`              | `ROLE_PRINCIPAL`          | List all teacher broadcast permissions  |
| GET    | `/notifications/announcements/permissions/{teacherId}`  | authenticated             | Get one teacher's permission            |
| PUT    | `/notifications/announcements/permissions/{teacherId}`  | `ROLE_PRINCIPAL`          | Set a teacher's permission              |

\* When `senderRole` is `TEACHER`/`ROLE_TEACHER`, the controller additionally requires a
granted broadcast permission for `senderUserId`, otherwise it returns **403 Forbidden**.

### 6.3 Request payloads

**POST `/notifications/send`** — `NotificationRequest` (`subject`, `body`, `channel` are
`@NotBlank`):

```json
{
  "userId": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  "recipientEmail": "student@example.com",
  "recipientPhone": "+15551234567",
  "subject": "Welcome to Art Academy",
  "body": "Your account has been created.",
  "channel": "EMAIL"
}
```

**POST `/notifications/announcements`** — `AnnouncementRequest` (`title`, `body`,
`audience` are `@NotBlank`; `recipientUserIds` is `@NotEmpty`/`@NotNull`):

```json
{
  "title": "Recital on Friday",
  "body": "All students must attend the 5pm recital.",
  "audience": "ALL_STUDENTS",
  "senderUserId": "9a1b0000-0000-0000-0000-000000000000",
  "senderRole": "ROLE_PRINCIPAL",
  "recipientUserIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**PUT `/notifications/announcements/permissions/{teacherId}`** — body is a simple map:

```json
{ "canBroadcast": true }
```

All responses are wrapped in the shared `ApiResponse<T>` envelope from common-library.

## 7. Service Logic

### 7.1 Send flow & status transitions (`NotificationService.sendNotification`)

1. Build a `Notification` from the request and persist it with `status = PENDING`
   (mapping `userId`, `recipientEmail`, `recipientPhone`, `subject`, `body`, `channel`).
2. Delivery branch by channel:
   - `EMAIL` or `BOTH` → `sendEmail(...)`.
   - Otherwise (`SMS`, `NONE`) → mark `SENT` immediately with `sentAt = now` (no SMS
     provider is integrated).
3. `sendEmail`:
   - If `recipientEmail` is null/blank → `status = FAILED`, `errorMessage = "Recipient email is missing"`.
   - Else build a `SimpleMailMessage` (to/subject/text) and call `mailSender.send(...)`.
     On success → `status = SENT`, `sentAt = now`. On exception → `status = FAILED`,
     `errorMessage = ex.getMessage()`.
4. Save the notification again and return the mapped `NotificationResponse`.

**Status transition summary:** `PENDING → SENT` (email success or SMS/NONE) or
`PENDING → FAILED` (missing email or SMTP error).

### 7.2 Read tracking

- `markAsRead(id)` — sets `isRead=true` and `readAt=now` only if currently unread.
- `markAllAsRead(userId)` — loads all unread via `findByUserIdAndIsReadFalse`, stamps
  `readAt=now`, saves in bulk.
- `getUnreadCount(userId)` — `countByUserIdAndIsReadFalse`.
- `getByUserId(userId, pageable)` — `findByUserIdOrderByCreatedAtDesc`, mapped to DTOs.

### 7.3 Announcement fan-out (`AnnouncementService.broadcast`)

1. Read `recipientUserIds` from the request.
2. Persist an `Announcement` with `recipientCount = recipients.size()`.
3. For each recipient, build an **inbox-only** `Notification`: `type = ANNOUNCEMENT`,
   `channel = NONE`, `status = SENT`, `isRead = false`, `title`/`subject = request title`,
   `sentAt = now`. Save all via `saveAll`. No email/SMS is dispatched for announcements.
4. Return the announcement (`AnnouncementResponse`).

### 7.4 Teacher broadcast-permission gate

- `canBroadcast(teacherId)` returns the stored `canBroadcast` flag, or `false` if no row
  exists (default deny).
- `AnnouncementController.broadcast` calls this whenever `senderRole` indicates a teacher;
  a missing `senderUserId` or a `false`/absent permission yields **403 Forbidden**.
- `setPermission(teacherId, canBroadcast)` upserts a `TeacherBroadcastPermission` row
  (creates when absent), stamping `updatedAt` via `@PreUpdate`/`@PrePersist`.
- `getPermission(teacherId)` returns `{teacherId, canBroadcast}` (false when unset);
  `getAllPermissions()` lists every stored row.

## 8. Kafka Consumers

`NotificationEventConsumer` registers four `@KafkaListener`s (group id
`notification-service`, container factory `kafkaListenerContainerFactory`, JSON payloads
from trusted package `com.artacademy.common.events`). Topic constants live in
`common-library/.../events/KafkaTopics.java`.

| Topic (constant)                                | Event                      | Resulting notification                                                                 |
|-------------------------------------------------|----------------------------|-----------------------------------------------------------------------------------------|
| `notification-request` (`NOTIFICATION_REQUEST`) | `NotificationRequestEvent` | Generic send using event fields; `channel` defaults to `EMAIL` when null              |
| `fee-generated` (`FEE_GENERATED`)               | `FeeGeneratedEvent`        | Fee reminder email to `studentId` — subject `Fee Reminder – <month>/<year>`, amount due |
| `payment-received` (`PAYMENT_RECEIVED`)         | `PaymentReceivedEvent`     | Payment confirmation email to `studentId` — includes payment id & fee-cycle id          |
| `attendance-recorded` (`ATTENDANCE_RECORDED`)   | `AttendanceRecordedEvent`  | Absence alert email — **only** when `status = ABSENT` and `attendanceType = STUDENT`   |

All handlers wrap processing in try/catch and log errors without rethrowing, so a single
bad message does not stall the listener. Each handler ultimately calls
`NotificationService.sendNotification(...)`, so the PENDING→SENT/FAILED transitions and the
persisted row apply to event-driven notifications too.

## 9. Migrations

- Single migration `V1__init_notification_schema.sql` under
  `src/main/resources/db/migration`. It is **schema-only**.
- There is **no `db/seed` folder** and **no `V2`/seed migration** — the `db` directory
  contains only `migration`. All notification/announcement/permission rows are created at
  runtime (via the REST API or Kafka consumers).
- Flyway location is `classpath:db/migration`; JPA `ddl-auto` is `validate`, so the entity
  mappings must match the migrated schema exactly.
