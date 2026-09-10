# Notification Service — Testing Guide

This guide covers manual/API testing of the notification-service. Requests can go through
the **API gateway at `http://localhost:8080`** (recommended, applies JWT routing) or
**directly at `http://localhost:8087`**. Base path in both cases is `/notifications`.

## Prerequisites

- Postgres running with `notification_db` migrated (Flyway `V1`). Tables start **empty** —
  there is no seed data.
- Kafka broker running (for event-driven scenarios).
- A valid JWT. Use a seeded platform account (e.g. the Principal admin) to log in via the
  auth service. Seeded accounts use password **`Admin@1234`**.
- **Email requires SMTP configured** (`MAIL_USERNAME` / `MAIL_PASSWORD` for Gmail).
  Without valid SMTP, EMAIL/BOTH sends transition to `FAILED` with an `errorMessage`, but
  the notification row is still persisted — assertions on row creation still hold.
- Set an auth header on all calls: `Authorization: Bearer <token>`.

## API Scenarios

| # | Scenario                              | Request                                                                                   | Auth (role)         | Expected result                                                                                  |
|---|---------------------------------------|-------------------------------------------------------------------------------------------|---------------------|--------------------------------------------------------------------------------------------------|
| 1 | Principal sends a notification        | `POST /notifications/send` with `{userId, recipientEmail, subject, body, channel:"EMAIL"}`| PRINCIPAL           | `200`, `ApiResponse.data` has an `id`; a `NOTIFICATIONS` row exists; status `SENT` (SMTP ok) or `FAILED` (SMTP down) |
| 2 | Non-principal send is blocked         | `POST /notifications/send`                                                                | STUDENT/TEACHER     | `403 Forbidden`                                                                                  |
| 3 | List notifications by user            | `GET /notifications/{userId}`                                                             | authenticated       | `200`, paginated `content` newest-first (`sort=createdAt`, size 20 default)                       |
| 4 | Mark one notification read            | `PUT /notifications/{id}/read`                                                            | authenticated       | `200`; row now `isRead=true` with `readAt` set                                                    |
| 5 | Mark all read                         | `PUT /notifications/read-all?userId={userId}`                                             | authenticated       | `200`; all that user's notifications `isRead=true`                                                |
| 6 | Unread count                          | `GET /notifications/unread-count?userId={userId}`                                         | authenticated       | `200`, `data` = number of unread rows (0 after scenario 5)                                        |
| 7 | Principal announcement to ALL_STUDENTS| `POST /notifications/announcements` with `audience:"ALL_STUDENTS"`, `recipientUserIds:[…]`, `senderRole:"ROLE_PRINCIPAL"` | PRINCIPAL | `200`; one `ANNOUNCEMENTS` row (`recipientCount = list size`); one inbox notification per recipient (`type=ANNOUNCEMENT`, `channel=NONE`, `status=SENT`) |
| 8 | Teacher announcement blocked          | `POST /notifications/announcements` with `senderRole:"ROLE_TEACHER"`, `senderUserId=<teacher>` (no permission granted) | TEACHER | `403 Forbidden` ("Teacher does not have broadcast permission")                                    |
| 9 | Grant teacher permission              | `PUT /notifications/announcements/permissions/{teacherId}` body `{ "canBroadcast": true }`| PRINCIPAL           | `200`; `data.canBroadcast=true`; `TEACHER_BROADCAST_PERMISSIONS` row upserted                     |
|10 | Teacher announcement now allowed      | Repeat scenario 8 after scenario 9                                                        | TEACHER             | `200`; announcement + inbox fan-out created                                                       |
|11 | Get a teacher's permission            | `GET /notifications/announcements/permissions/{teacherId}`                                | authenticated       | `200`, `{teacherId, canBroadcast}` (false when never set)                                         |
|12 | List all permissions                  | `GET /notifications/announcements/permissions`                                            | PRINCIPAL           | `200`, list of `{teacherId, canBroadcast}`                                                        |
|13 | List announcement history             | `GET /notifications/announcements`                                                        | PRINCIPAL           | `200`, paginated announcements newest-first                                                       |

## Event-Driven Scenarios

Trigger the upstream action, then verify a `NOTIFICATIONS` row appears (query
`GET /notifications/{userId}` for the affected user, or inspect the DB).

| # | Upstream trigger                                                     | Topic                  | Expected notification                                                                 |
|---|---------------------------------------------------------------------|------------------------|----------------------------------------------------------------------------------------|
|14 | Record a student's attendance as **ABSENT** (attendance-service)     | `attendance-recorded`  | Absence-alert email notification for that student; row created (only for ABSENT/STUDENT) |
|15 | Generate a fee cycle for a student (fee-service)                     | `fee-generated`        | Fee-reminder notification with subject `Fee Reminder – <month>/<year>` and amount due  |
|16 | Record a payment for a student (payment-service)                    | `payment-received`     | Payment-confirmation notification including payment id and fee-cycle id                 |
|17 | Publish a generic notification request from any service              | `notification-request` | Notification created from event fields; channel defaults to `EMAIL` when null           |

Notes:
- For scenario 14, an event with `status != ABSENT` or `attendanceType != STUDENT` must
  produce **no** notification — good negative test.
- Delivery status will be `SENT` with valid SMTP or `FAILED` (with `errorMessage`) without
  it; either way the row and its lifecycle are observable.

## Verification Tips

- Inspect rows directly:
  `SELECT id, user_id, type, channel, status, is_read, error_message FROM NOTIFICATIONS ORDER BY created_at DESC;`
- Check announcement fan-out count:
  `SELECT recipient_count FROM ANNOUNCEMENTS ORDER BY created_at DESC LIMIT 1;`
  should equal the number of inbox rows created (`type = 'ANNOUNCEMENT'`) for that broadcast.
- Confirm permission upsert:
  `SELECT * FROM TEACHER_BROADCAST_PERMISSIONS WHERE teacher_id = '<uuid>';`
