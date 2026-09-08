# Auth Service — Detail Design Document

## 1. Overview

The `auth-service` owns authentication, JWT access-token issuance, refresh-token lifecycle, password management (change + forgot/reset), account lockout, an audit log, and user/role administration. It owns the `USERS`, `ROLES`, `USER_ROLES`, `REFRESH_TOKENS`, `PASSWORD_RESET_TOKENS`, and `AUDIT_LOGS` tables and is the only service that touches these credentials.

Auth users are **not** created via HTTP. When user-service publishes a `*-created` Kafka event, this service consumes it and creates a matching auth user with the **same UUID** and the roles carried by the event (see §9).

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `auth-service` |
| Package root | `com.artacademy.auth` |
| Server port | **8081** local/dev · **8081** Docker container (host-mapped `8081:8081`) |
| Database | `auth_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

---

## 3. Component Structure

```
com.artacademy.auth
├── AuthServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   ├── KafkaConsumerConfig.java
│   └── KafkaProducerConfig.java
├── consumer
│   └── UserCreatedEventConsumer.java
├── controller
│   └── AuthController.java
├── domain
│   ├── User.java
│   ├── Role.java
│   ├── RefreshToken.java
│   ├── PasswordResetToken.java
│   └── AuditLog.java
├── dto
│   ├── LoginRequest.java / LoginResponse.java
│   ├── RefreshTokenRequest.java
│   ├── ChangePasswordRequest.java
│   ├── ForgotPasswordRequest.java / ResetPasswordRequest.java
│   ├── UpdateUserStatusRequest.java / UpdateUserRolesRequest.java
│   ├── UserSummaryResponse.java
│   └── AuditLogResponse.java
├── repository
│   ├── UserRepository.java
│   ├── RoleRepository.java
│   ├── RefreshTokenRepository.java
│   ├── PasswordResetTokenRepository.java
│   └── AuditLogRepository.java
└── service
    ├── AuthService.java
    ├── RefreshTokenService.java
    ├── PasswordResetService.java
    ├── LoginAttemptService.java
    ├── AuditLogService.java
    └── UserManagementService.java
```

---

## 4. Domain Model

### 4.1 `User` (table `USERS`)

```
UUID       id            (PK — NOT auto-generated; set from the *-created event's UUID)
String     username      (unique, not null, max 100)
String     password      (BCrypt hash, not null)
String     email         (unique, not null, max 200)
String     status        (max 20, default 'ACTIVE')
Instant    createdAt
Instant    updatedAt
Set<Role>  roles         (ManyToMany EAGER, join table USER_ROLES)
```

### 4.2 `Role` (table `ROLES`)

```
UUID    id
String  name   (unique — ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT)
```

**Seed data (V4 migration):** `ADMIN`, `PRINCIPAL`, `TEACHER`, `STUDENT`, `PARENT`.

### 4.3 `RefreshToken` (table `REFRESH_TOKENS`)

```
UUID     id
User     user        (ManyToOne LAZY)
String   token       (unique UUID string)
Instant  expiryDate
```

One token per user — creating a new one deletes existing tokens for that user.

### 4.4 `PasswordResetToken` (table `PASSWORD_RESET_TOKENS`)

```
UUID     id
User     user        (ManyToOne LAZY, not null)
String   token       (unique, max 200)
Instant  expiryDate  (1 hour after issue)
boolean  used        (default false)
```

### 4.5 `AuditLog` (table `AUDIT_LOGS`)

```
UUID     id
String   username    (not null, max 100)
String   action      (not null, max 100 — LOGIN, LOGIN_FAILED, LOGOUT, CHANGE_PASSWORD, RESET_PASSWORD, UPDATE_USER_STATUS, UPDATE_USER_ROLES, …)
String   detail      (TEXT, nullable)
String   ipAddress   (max 50; resolved from X-Forwarded-For or remote addr)
boolean  success
Instant  occurredAt  (default now())
```

---

## 5. Database Schema

Managed by Flyway. Final state after V6 migration:

```sql
CREATE TABLE ROLES (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE USERS (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username   VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    email      VARCHAR(200) UNIQUE NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE USER_ROLES (
    user_id UUID REFERENCES USERS(id) ON DELETE CASCADE,
    role_id UUID REFERENCES ROLES(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE REFRESH_TOKENS (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES USERS(id) ON DELETE CASCADE,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL
);

CREATE TABLE PASSWORD_RESET_TOKENS (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES USERS(id) ON DELETE CASCADE,
    token       VARCHAR(200) UNIQUE NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_prt_token ON PASSWORD_RESET_TOKENS(TOKEN);

CREATE TABLE AUDIT_LOGS (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(100) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    detail      TEXT,
    ip_address  VARCHAR(50),
    success     BOOLEAN NOT NULL DEFAULT TRUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_username    ON AUDIT_LOGS(USERNAME);
CREATE INDEX idx_audit_occurred_at ON AUDIT_LOGS(OCCURRED_AT DESC);
```

---

## 6. REST API

Base path: `/auth`. All responses use the shared `ApiResponse<T>` envelope.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | Public | Authenticate; returns tokens + profile |
| `POST` | `/auth/refresh` | Public | Exchange a refresh token for a new access + refresh token |
| `POST` | `/auth/logout` | PRINCIPAL (any authenticated) | Delete the caller's refresh tokens |
| `POST` | `/auth/change-password` | Any authenticated | Change own password |
| `POST` | `/auth/forgot-password` | Public | Request a reset token (emailed via Kafka → notification-service) |
| `POST` | `/auth/reset-password` | Public | Reset password using a token |
| `GET` | `/auth/me` | Any authenticated | Own profile (id, username, email, roles, status) |
| `GET` | `/auth/audit-logs` | PRINCIPAL | Paginated audit logs; optional `username` filter |
| `GET` | `/auth/users` | PRINCIPAL | Paginated user list |
| `PATCH` | `/auth/users/{id}/status` | PRINCIPAL | Activate / deactivate an account |
| `GET` | `/auth/users/{id}/roles` | PRINCIPAL | List a user's roles |
| `PUT` | `/auth/users/{id}/roles` | PRINCIPAL | Replace a user's roles |

### `POST /auth/login`

**Request:** `{ "username": "principal", "password": "Admin@1234" }`

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "refreshToken": "<UUID>",
    "tokenType": "Bearer",
    "id": "<UUID>",
    "username": "principal",
    "email": "principal@artacademy.test",
    "roles": ["PRINCIPAL"]
  }
}
```

**Errors:** `400` invalid credentials · `403` account not active · `403` account temporarily locked (with seconds remaining).

### `POST /auth/refresh`

Request `{ "refreshToken": "<UUID>" }` → same shape as login with a new access + refresh token. `400` if the token is unknown/expired.

### `POST /auth/change-password`

Request `{ "currentPassword": "...", "newPassword": "..." }`. `400` if the current password is wrong.

### `POST /auth/forgot-password` / `POST /auth/reset-password`

`forgot-password` `{ "email": "..." }` always returns success (no email enumeration); if the email is known, a reset token is generated (1-hour expiry) and a `notification-request` Kafka event is published. `reset-password` `{ "token": "...", "newPassword": "..." }` validates the token (must exist, be unused, and not expired), sets the new password, and marks the token used.

---

## 7. Service Logic

### `AuthService`

| Method | Logic |
|--------|-------|
| `login(request, ip)` | Reject if `LoginAttemptService.isBlocked`; load user by username; on missing user or password mismatch record failure + audit `LOGIN_FAILED` and throw `400`; if status ≠ `ACTIVE` audit + throw `403`; else record success, issue JWT + refresh token, audit `LOGIN` |
| `logout(username, ip)` | Delete the user's refresh tokens; audit `LOGOUT` |
| `refresh(request)` | Look up token; `verifyExpiry`; issue new access + refresh token |
| `changePassword(username, request, ip)` | Verify current password (`400` on mismatch); encode + save new; audit |
| `forgotPassword(request)` | Delegate to `PasswordResetService.initiateReset(email)` |
| `resetPassword(request, ip)` | Resolve username (best-effort, for audit), then `PasswordResetService.resetPassword`; audit `RESET_PASSWORD` |
| `getMe(username)` | Load user or `404` |

### `RefreshTokenService`

`createRefreshToken(user)` deletes existing tokens for the user, creates a new random-UUID token with expiry `now + refreshTokenDurationMs` (from config). `verifyExpiry` deletes an expired token and throws `400`. `findByToken` throws `400` if not found.

### `PasswordResetService`

Generates a random-UUID token (1-hour expiry), deletes any prior token for the user, persists, and publishes a `NotificationRequestEvent` on `notification-request` (`EMAIL` channel) containing the raw token. Reset validates unused + unexpired, encodes the new password, and marks the token used.

### `LoginAttemptService`

In-memory, per-username failure counter. After **5** consecutive failures the account is locked for **15 minutes**. A successful login clears the counter. Not persisted — resets on service restart.

### `UserManagementService`

`findAll(Pageable)` → `UserSummaryResponse` page; `updateStatus(id, status, actor, ip)`, `getUserRoles(id)`, `updateRoles(id, roleNames, actor, ip)` — role changes replace the full set (roles resolved by name, `400` if unknown). All mutations write an audit log.

### `AuditLogService`

`log(username, action, detail, ip, success)` persists an `AuditLog`; `findAll(Pageable)` / `findByUsername(username, Pageable)` back the audit-log endpoint (default sort `occurredAt DESC`).

---

## 8. Security Configuration

```
// Permitted without JWT
/auth/login
/auth/refresh
/auth/forgot-password
/auth/reset-password
/swagger-ui/**
/v3/api-docs/**
/actuator/**

// All other paths require authentication
```

CSRF disabled; session management `STATELESS`; method security enabled (`@PreAuthorize` on admin endpoints). `JwtAuthenticationFilter` (from common-library) runs before `UsernamePasswordAuthenticationFilter`.

---

## 9. Kafka

### 9.1 Consumed — `UserCreatedEventConsumer` (group `auth-service-group`)

| Topic | Action |
|-------|--------|
| `student-created` | Create auth `User` with `id = studentId`, username/email/encoded temporaryPassword, roles from event (default `["STUDENT"]`); skip if username exists |
| `teacher-created` | Same, `id = teacherId`, default roles `["TEACHER"]` |
| `parent-created` | Same, `id = parentId`, default roles `["PARENT"]` |

Roles are resolved by name against `ROLES`. This is what keeps the platform-wide UUID identical across databases.

### 9.2 Produced

| Topic | Event | When |
|-------|-------|------|
| `notification-request` | `NotificationRequestEvent` | Password-reset token issued (`forgot-password`) |

---

## 10. Dependencies

In addition to common-library:

```xml
spring-boot-starter-data-jpa
spring-kafka
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
| V1 | Initial schema (BIGSERIAL IDs) |
| V2 | Seed PRINCIPAL, TEACHER, STUDENT roles |
| V3 | Drop and recreate all tables with UUID primary keys |
| V4 | Re-seed roles (`ADMIN`, `PRINCIPAL`, `TEACHER`, `STUDENT`, `PARENT`) using `gen_random_uuid()` |
| V5 | Add `PASSWORD_RESET_TOKENS` and `AUDIT_LOGS` (+ indexes) |
| V6 | Seed sample users (principal, 2 teachers, 3 students, 1 parent) with fixed UUIDs matching user-service; shared password `Admin@1234` |

> **Security note:** the V6 seed accounts and their shared password are for **local/testing only** and must be removed or rotated before any production deployment.
