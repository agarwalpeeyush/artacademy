# Notification Service — Product Requirements Document

## Purpose

Provide a single platform capability for **reaching users** — both via outbound email and
via an **in-app notification centre** — and for **broadcasting announcements** to targeted
audiences. The service reacts to business events across the platform (fees, payments,
attendance) and turns them into timely notifications, while also giving Principals a manual
send channel and an announcement tool that selected Teachers may share.

## Scope

**In scope**

- Persisting every notification with a delivery lifecycle (`PENDING → SENT/FAILED`).
- Email delivery via Gmail SMTP (`JavaMailSender`).
- Event-driven notifications for fee generation, payment receipt, and student absence, plus
  a generic notification-request channel.
- Per-user notification centre: list, mark-read, mark-all-read, unread count.
- Announcements with audience targeting and per-recipient inbox fan-out.
- Teacher broadcast permission management (grant/revoke by Principal).

**Out of scope**

- SMS delivery (no provider integrated; SMS-only messages are recorded as `SENT` without
  transmission).
- Push/mobile notifications.
- User/role management (owned by user & auth services).
- Resolving an audience into concrete recipient ids — callers supply `recipientUserIds`.

## Functional Requirements

| ID       | Requirement                                                                                                      | Trigger / Actor                                  |
|----------|------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|
| NTF-01   | On a student absence, generate an absence-alert email notification for the student/guardian.                     | `attendance-recorded` (status ABSENT, type STUDENT) |
| NTF-02   | On fee generation, generate a fee-reminder email notification with the amount and billing period.                | `fee-generated` event                            |
| NTF-03   | On payment receipt, generate a payment-confirmation email notification (payment id, fee-cycle id, amount).       | `payment-received` event                         |
| NTF-04   | Accept a generic notification request from any service and deliver it (channel defaults to EMAIL).               | `notification-request` event                     |
| NTF-05   | Allow a Principal to manually send a notification via REST.                                                       | `POST /notifications/send` (Principal)           |
| NTF-06   | Provide a per-user notification centre: paginated list, newest first.                                            | `GET /notifications/{userId}` (authenticated)    |
| NTF-07   | Allow a user to mark a single notification as read.                                                              | `PUT /notifications/{id}/read`                   |
| NTF-08   | Allow a user to mark all their notifications as read.                                                            | `PUT /notifications/read-all?userId=`            |
| NTF-09   | Expose an unread-count for a user (for badge display).                                                           | `GET /notifications/unread-count?userId=`        |
| NTF-10   | Allow a Principal (or permitted Teacher) to broadcast an announcement fanned out to each recipient's inbox.      | `POST /notifications/announcements`              |
| NTF-11   | Record announcement history with audience, sender, and recipient count; queryable by Principal.                 | `GET /notifications/announcements` (Principal)   |
| NTF-12   | Let a Principal grant or revoke a Teacher's broadcast permission and view all/one permission(s).                 | `GET`/`PUT /notifications/announcements/permissions[...]` |
| NTF-13   | Persist every notification with a status lifecycle and error capture, so failures are auditable.                 | All send paths                                   |

## Business Rules

- **Delivery lifecycle:** notifications are stored `PENDING`, then transition to `SENT` on
  successful delivery (or immediate marking for SMS/NONE channels) or `FAILED` with a stored
  `errorMessage` when delivery fails or the recipient email is missing.
- **Channels:** `EMAIL`, `SMS`, `BOTH`, `NONE`. Only `EMAIL`/`BOTH` actually transmit (email).
  `SMS`/`NONE` are marked `SENT` without sending. Announcement fan-out rows use `NONE`.
- **Teacher broadcast gate:** a Teacher may broadcast **only** if a
  `TeacherBroadcastPermission` row exists with `canBroadcast = true` for their user id.
  Absent permission defaults to deny; unauthorized attempts return **403 Forbidden**.
  Principals may always broadcast.
- **Audience targeting:** announcements carry an audience label — `ALL_STUDENTS`,
  `ALL_TEACHERS`, or `TEACHER_STUDENTS`. The caller resolves the audience into the
  `recipientUserIds` list; the service fans out one inbox notification per id and records
  `recipientCount`.
- **Absence alerts** are only produced for events where `status = ABSENT` **and**
  `attendanceType = STUDENT`; all other attendance events are ignored.
- **Read semantics:** marking read sets `readAt`; marking an already-read notification is a
  no-op. Unread count excludes read notifications.
- **Access control:** manual send, announcement history, and permission management are
  Principal-only; broadcast is Principal or permitted Teacher; inbox/read/count operations
  require any authenticated user.

## Dependencies

- **Kafka (consumer):** `attendance-recorded`, `fee-generated`, `payment-received`, and
  `notification-request` topics (constants in `common-library` `KafkaTopics`). The service
  publishes no events.
- **SMTP:** Gmail (`smtp.gmail.com:587`, STARTTLS) via `JavaMailSender`; credentials from
  `MAIL_USERNAME` / `MAIL_PASSWORD`.
- **PostgreSQL:** `notification_db` (schema managed by Flyway, `ddl-auto=validate`).
- **common-library:** `ApiResponse` envelope, JWT `JwtAuthenticationFilter`, and event DTOs.
- **Config Server / Eureka:** externalized configuration and service discovery.
- Upstream producers: attendance-service (attendance events), fee-service /
  payment-service (fee & payment events), and any service emitting a notification request.
