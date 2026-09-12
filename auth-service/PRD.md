# Auth Service — Product Requirements Document

## 1. Purpose

The auth-service is the single source of truth for identity and access on the Art
Academy platform. It authenticates users, issues and refreshes JWT access tokens,
manages passwords (change, forgot, reset), enforces account lockout, records a
security audit trail, and lets a PRINCIPAL administer users and roles. It does not
create accounts through its own API — accounts are provisioned automatically from
`*-created` domain events so that every user carries the same identity (UUID) across
the platform.

---

## 2. Scope

In scope:

- Credential storage (BCrypt) and JWT-based stateless authentication.
- Login with brute-force lockout, logout, and single-active refresh tokens.
- Self-service password change and email-driven forgot/reset flow.
- Role-based authorization (`ADMIN`, `PRINCIPAL`, `TEACHER`, `STUDENT`, `PARENT`).
- PRINCIPAL administration: list users, view/replace roles, change account status,
  view audit logs.
- Automatic account provisioning by consuming student/teacher/parent creation events.
- Security audit trail of authentication and administration actions.

Out of scope:

- User self-registration over HTTP (accounts arrive via Kafka events).
- Profile/domain data (owned by the student, teacher, and parent services).
- Actual email delivery (delegated to notification-service via Kafka).

---

## 3. Functional Requirements

| ID     | Feature                 | Role      | Description                                                                                   |
|--------|-------------------------|-----------|-----------------------------------------------------------------------------------------------|
| AUTH-1 | Login                   | Public    | Authenticate username/password; return access + refresh tokens and profile.                   |
| AUTH-2 | Refresh token           | Public    | Exchange a valid refresh token for a new access + refresh token pair (replaces the single active token). |
| AUTH-3 | Forgot password         | Public    | Request a reset token by email; response is uniform whether or not the email is known.        |
| AUTH-4 | Reset password          | Public    | Set a new password using a valid, unused, unexpired reset token.                              |
| AUTH-5 | Logout                  | Auth      | Invalidate the caller's refresh token(s).                                                     |
| AUTH-6 | Change password         | Auth      | Change own password after verifying the current password.                                     |
| AUTH-7 | Current profile (`/me`) | Auth      | Return the caller's id, username, email, roles, and status.                                   |
| AUTH-8 | View audit logs         | PRINCIPAL | Paged audit log, optionally filtered by username, newest first.                               |
| AUTH-9 | List users              | PRINCIPAL | Paged list of all users with roles and status.                                                |
| AUTH-10| Get user roles          | PRINCIPAL | Return the role names assigned to a user.                                                      |
| AUTH-11| Replace user roles      | PRINCIPAL | Replace the full role set of a user (unknown role names are rejected).                         |
| AUTH-12| Update user status      | PRINCIPAL | Change a user's account status (e.g. activate/deactivate).                                     |
| AUTH-13| Provision from events   | System    | Consume `student-created` / `teacher-created` / `parent-created` and create a matching account. Events missing a required identity (id/username) are rejected and routed to the topic's DLT.|
| AUTH-14| Reset-email dispatch    | System    | Publish a `notification-request` event so notification-service emails the reset token.        |

---

## 4. Business Rules

- **Shared UUID identity.** An auth account created from a `*-created` event uses the
  UUID carried in the event (studentId / teacherId / parentId) as its primary key, so
  the same person has the same id in every service database.
- **Account lockout.** Five consecutive failed login attempts lock the account for 15
  minutes. A successful login clears the failure counter; the lock auto-expires after
  the window. (Counter is in-memory and per-instance.)
- **Deactivated users cannot log in.** Login succeeds only when the account status is
  `ACTIVE`; any other status returns 403 even with correct credentials, and the
  attempt is recorded as `LOGIN_FAILED`.
- **No email enumeration.** Forgot-password returns the same success message whether
  or not the email exists; a token is generated only for known emails.
- **Email is optional.** Auto-provisioned parent logins have no email (their identity
  is a phone number used as the username); email is nullable and not unique at the DB
  level, so email-based self-service reset is unavailable to phone-only accounts.
- **Single active refresh token per user.** Issuing a new refresh token (on login or
  refresh) deletes the user's existing tokens. This is a deliberate single-session
  model; per-device tokens and true rotation/revocation are not yet implemented.
- **Reset tokens are single-use and time-boxed.** A reset token is valid for 1 hour
  and is marked used after a successful reset.
- **Role changes are full replacements.** Updating a user's roles replaces the entire
  set; unknown role names are rejected.
- **Audit everything.** Login, failed login, logout, password change (and failure),
  password reset, status updates, and role updates are written to the audit log with
  actor username, IP address, and success flag.

---

## 5. Dependencies

- **Kafka (consumer).** Consumes `student-created`, `teacher-created`,
  `parent-created` (group `auth-service-group`) to provision accounts.
- **Kafka (producer).** Publishes `NotificationRequestEvent` on `notification-request`
  for password-reset emails; delivery is handled by notification-service.
- **config-server.** Supplies externalized configuration (datasource, port, Kafka,
  JWT settings) via Spring Cloud Config.
- **Eureka.** Service registration/discovery so the api-gateway can route `/auth/**`.
- **PostgreSQL.** Database `auth_db` (schema managed by Flyway, validated by JPA).
- **common-library.** Shared `JwtUtil`, `JwtAuthenticationFilter`, `ApiResponse`,
  `ApiException`, and `KafkaTopics` / event classes.
