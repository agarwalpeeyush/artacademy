# auth-service — Design

Authentication and identity service. Issues JWTs, manages users/roles, refresh and password-reset tokens, audit logging, and account lockout. Port 8081, database `auth_db`. Base path `/auth`. Spring Boot 3.3.4 / Java 21, PostgreSQL (Flyway validate), Kafka, JWT via common-library. Responses wrapped in `ApiResponse<T> {success, message, data}`.

## Endpoints (AuthController, base `/auth`)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/login` | public | Issues JWT + refresh token, IP tracked |
| POST | `/logout` | authenticated | Invalidates refresh token, audited |
| POST | `/refresh` | public | Exchanges refresh token for new JWT |
| POST | `/change-password` | authenticated | Bootstrap admin forbidden |
| POST | `/forgot-password` | public | 1hr token, emails via Kafka `notification-request` |
| POST | `/reset-password` | public | One-use token |
| GET | `/me` | authenticated | Current user info |
| GET | `/audit-logs` | PRINCIPAL | Paginated, filter by username |
| GET | `/users` | PRINCIPAL | Paginated |
| PATCH | `/users/{id}/status` | PRINCIPAL | Audited |
| GET | `/users/{id}/roles` | PRINCIPAL | |
| PUT | `/users/{id}/roles` | PRINCIPAL | Audited |

## Entities

| Entity | Key fields |
|--------|-----------|
| User | id (UUID), username (unique), password (BCrypt), email (nullable), phone, status (default ACTIVE), mustChangePassword, bootstrap, roles (M2M) |
| Role | id, name (unique) — seeded ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT |
| RefreshToken | userId (FK), token (unique), expiry, cascade delete |
| PasswordResetToken | userId (FK), token (unique), expiry, used — one-use, 1hr lifetime |
| AuditLog | username, action, detail, ipAddress, success, occurredAt; indexed (username + occurredAt DESC) |

## Migrations

| Version | Description |
|---------|-------------|
| V1 | `init_auth_schema.sql` — roles + users + audit |
| V2 | `db/seed/V2__seed_dev_data.sql` — docker profile only; seeds ONLY a bootstrap `admin` account (local-dev default `Admin@1234`, overridable via `BOOTSTRAP_ADMIN_USERNAME`/`BOOTSTRAP_ADMIN_PASSWORD`) |

Latest: V2.

## Kafka

Consumer group: `auth-service-group`.

**Consumes:**
- `student-created`, `teacher-created`, `parent-created` → create matching auth user with the SAME UUID, merge roles; self-deactivate the bootstrap admin once a PRINCIPAL exists.
- `student-deleted`, `teacher-deleted`, `parent-deleted` → delete the corresponding auth user.

**Produces:**
- `notification-request` (password reset email).

## Security

- 5 failed logins → 15-minute lockout (`LoginAttemptService`).
- Deactivated users cannot log in.
- Bootstrap admin can only create the first PRINCIPAL, then self-deactivates.
- JWT carries roles + a `bootstrap` claim; 15-minute expiry.
