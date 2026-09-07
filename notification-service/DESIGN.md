# Notification Service — Detail Design Document

## 1. Overview

The `notification-service` is a pure consumer service. It listens to multiple Kafka topics, decides whether a notification is warranted, persists the notification record, and delivers it via email using JavaMailSender. It also exposes a manual send endpoint and a history query endpoint. No other service calls this service directly at request time.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `notification-service` |
| Package root | `com.artacademy.notification` |
| Server port | **8087** local/dev · **8087** Docker container (host-mapped `8087:8087`) |
| Database | `notification_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

---

## 3. Component Structure

```
com.artacademy.notification
├── NotificationServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   └── KafkaConsumerConfig.java
├── controller
│   └── NotificationController.java
├── domain
│   └── Notification.java
├── dto
│   ├── NotificationRequest.java
│   └── NotificationResponse.java
├── kafka
│   └── NotificationEventConsumer.java
├── repository
│   └── NotificationRepository.java
└── service
    └── NotificationService.java
```

---

## 4. Domain Model

### `Notification`

```
UUID     id
UUID     userId           (recipient user UUID; null for system notifications)
String   recipientEmail
String   recipientPhone
String   subject
String   body
String   channel          (EMAIL | SMS | BOTH)
String   status           (PENDING | SENT | FAILED)
Instant  sentAt           (set when SENT)
Instant  createdAt        (@PrePersist)
String   errorMessage     (populated on failure)
```

---

## 5. Database Schema

Final state after V2 migration:

```sql
CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID,
    recipient_email  VARCHAR(255),
    recipient_phone  VARCHAR(20),
    subject          VARCHAR(500),
    body             TEXT,
    channel          VARCHAR(20) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    error_message    TEXT
);
CREATE INDEX idx_notif_user ON notifications(user_id);
```

---

## 6. REST API

Base path: `/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/notifications/send` | PRINCIPAL | Manually send a notification |
| `GET` | `/notifications/{userId}` | PRINCIPAL | Get paginated notification history for a user |

**Pagination defaults:** `page=0, size=20, sort=createdAt,DESC`

#### `POST /notifications/send` — Request Body

```json
{
  "userId": "<UUID>",
  "recipientEmail": "parent@example.com",
  "recipientPhone": "9876543210",
  "subject": "Fee Reminder",
  "body": "Your November fees are due.",
  "channel": "EMAIL"
}
```

#### `GET /notifications/{userId}` — Response

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "<UUID>",
        "subject": "Fee Reminder",
        "body": "...",
        "channel": "EMAIL",
        "status": "SENT",
        "sentAt": "2024-11-01T08:30:00Z",
        "createdAt": "2024-11-01T08:29:55Z"
      }
    ],
    "totalElements": 12,
    "totalPages": 1
  }
}
```

---

## 7. Service Logic

### `NotificationService.sendNotification(request)`

1. Create `Notification` entity with `status = PENDING`.
2. Persist (ensures record even if delivery fails).
3. If `channel` includes `EMAIL` and `recipientEmail` is not blank:
   - Build `SimpleMailMessage`.
   - Call `JavaMailSender.send(message)`.
   - On success: set `status = SENT`, `sentAt = Instant.now()`.
   - On exception: set `status = FAILED`, `errorMessage = e.getMessage()`.
4. Save updated entity.
5. Return `NotificationResponse`.

SMS delivery is not yet implemented — `channel=SMS` records are persisted as PENDING but no delivery attempt is made.

---

## 8. Kafka Event Consumer

### `NotificationEventConsumer`

Consumer group: `notification-service`.

| Topic | Trigger condition | Notification sent |
|-------|-------------------|-------------------|
| `notification.request` | Always | Uses event's `recipientEmail`, `subject`, `body`, `channel` directly |
| `fee.generated` | Always | Subject: "Fee Generated for Month X/Y"; Body: total amount owed |
| `payment.received` | Always | Subject: "Payment Received"; Body: payment amount confirmed |
| `attendance.recorded` | `attendanceType == STUDENT` AND `status == ABSENT` | Subject: "Absence Alert"; Body: student was absent on `attendanceDate` |

All four paths call the same `sendNotification()` method after constructing the appropriate `NotificationRequest`.

---

## 9. Email Configuration

Configured via Config Server:

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

---

## 10. Dependencies

In addition to common-library:

```xml
spring-boot-starter-mail
spring-boot-starter-data-jpa
spring-cloud-starter-netflix-eureka-client
spring-cloud-starter-config
postgresql (runtime)
flyway-core
flyway-database-postgresql
springdoc-openapi-starter-webmvc-ui (v2.6.0)
```

---

## 11. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGINT ID |
| V2 | Migrated to UUID PK; added index on user_id |
