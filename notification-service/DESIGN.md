# Notification Service - Design

Kafka-driven consumer that sends emails and manages in-app notifications and announcements for the Art Academy platform.

- **Stack:** Spring Boot 3.3.4, Java 21, PostgreSQL (Flyway `validate`), Kafka, JWT via common-library.
- **Port:** 8087
- **Database:** `notification_db`
- **Responses:** wrapped in `ApiResponse<T> {success, message, data}`.

## Email / Channels

- SMTP: `smtp.gmail.com:587`, StartTLS, auth enabled.
- Credentials via `MAIL_USERNAME` / `MAIL_PASSWORD` env vars.
- Channel is modelled as EMAIL / SMS / BOTH, but SMS is **not** wired to a live transport - email is the only live channel.

## Endpoints

### NotificationController (`/notifications`)

| Method | Path | Description | Role |
| --- | --- | --- | --- |
| POST | `/notifications/send` | Send a notification | PRINCIPAL |
| GET | `/notifications/{userId}` | List notifications (paginated) | |
| PUT | `/notifications/{id}/read` | Mark one as read | |
| PUT | `/notifications/read-all` | Mark all as read | |
| GET | `/notifications/unread-count` | Unread count | |

### AnnouncementController (`/notifications/announcements`)

| Method | Path | Description | Role |
| --- | --- | --- | --- |
| POST | `/` | Create an announcement | PRINCIPAL always; TEACHER if canBroadcast |
| GET | `/` | Announcement history | PRINCIPAL |
| GET | `/permissions` | List broadcast permissions | PRINCIPAL |
| GET | `/permissions/{teacherId}` | Get a teacher's permission | |
| PUT | `/permissions/{teacherId}` | Set a teacher's permission | PRINCIPAL |

## Entities

| Entity | Key fields |
| --- | --- |
| Notification | userId, recipientEmail, recipientPhone, subject, title, type, body, isRead, readAt, channel, status (PENDING\|SENT\|FAILED), sentAt, createdAt, errorMessage |
| Announcement | title, body, audience (ALL_STUDENTS\|ALL_TEACHERS\|TEACHER_STUDENTS), senderUserId, senderRole, recipientCount, createdAt |
| TeacherBroadcastPermission | teacherId (PK), canBroadcast, updatedAt |

## Migrations

| Version | Description |
| --- | --- |
| V1__init_notification_schema.sql | 3 tables |

## Kafka

**Produces:** none.

**Consumes:**

| Topic | Effect |
| --- | --- |
| notification-request | Generic request -> create + send |
| fee-generated | Fee reminder email |
| payment-received | Payment confirmation email |
| attendance-recorded | Absence alert only when status = ABSENT |
| exam-scheduled | Exam notice to enrolled students |
