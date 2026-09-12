# Auth Service — Detail Design Document

## 1. Overview

The `auth-service` is the identity and access-management module of the Art Academy
platform. It owns user credentials, roles, JWT issuance/refresh, password reset,
account lockout, and a security audit trail. It is the only service that touches the
`USERS`, `ROLES`, `USER_ROLES`, `REFRESH_TOKENS`, `PASSWORD_RESET_TOKENS`, and
`AUDIT_LOGS` tables.

Auth accounts are **not** created over HTTP. When the student/teacher/parent services
publish a `*-created` Kafka event, this service consumes it and provisions a matching
login account **with the same UUID** and the roles carried by the event, so a user's
identity is consistent across every service database (see §8).

Key characteristics:

- Spring Boot 3.3.4 on Java 21.
- Stateless JWT authentication (JJWT 0.12.6) + Spring Security + BCrypt.
- PostgreSQL persistence (`auth_db`) with Flyway-managed schema; JPA runs under
  `ddl-auto: validate`.
- Kafka **consumer** of `student-created`, `teacher-created`, `parent-created`.
- Kafka **producer** of `notification-request` (password-reset emails only).
- Registers with Eureka and pulls configuration from the config-server.

---

## 2. Module Coordinates

| Property     | Value                          |
|--------------|--------------------------------|
| ArtifactId   | `auth-service`                 |
| Package root | `com.artacademy.auth`          |
| Server port  | `8081`                         |
| Database     | `auth_db` (PostgreSQL)         |

---

## 3. Component Structure

Package tree derived from the actual source files:

```
com.artacademy.auth
├── AuthServiceApplication.java
├── config
│   ├── KafkaConsumerConfig.java        # consumer factory + listener container (group auth-service-group)
│   ├── KafkaProducerConfig.java        # producer factory + KafkaTemplate (notification-request)
│   └── SecurityConfig.java             # filter chain, public routes, PRINCIPAL-guarded routes, BCrypt
├── consumer
│   └── UserCreatedEventConsumer.java   # listens to student/teacher/parent-created
├── controller
│   └── AuthController.java             # all /auth REST endpoints
├── domain
│   ├── AuditLog.java
│   ├── PasswordResetToken.java
│   ├── RefreshToken.java
│   ├── Role.java
│   └── User.java
├── dto
│   ├── AuditLogResponse.java
│   ├── ChangePasswordRequest.java
│   ├── ForgotPasswordRequest.java
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   ├── RefreshTokenRequest.java
│   ├── ResetPasswordRequest.java
│   ├── UpdateUserRolesRequest.java
│   ├── UpdateUserStatusRequest.java
│   └── UserSummaryResponse.java
├── repository
│   ├── AuditLogRepository.java
│   ├── PasswordResetTokenRepository.java
│   ├── RefreshTokenRepository.java
│   ├── RoleRepository.java
│   └── UserRepository.java
└── service
    ├── AuditLogService.java
    ├── AuthService.java                # login, logout, refresh, change/forgot/reset password, getMe
    ├── LoginAttemptService.java        # in-memory lockout (5 failures / 15 min)
    ├── PasswordResetService.java       # reset-token lifecycle + notification event
    ├── RefreshTokenService.java        # refresh-token creation/verification
    └── UserManagementService.java      # PRINCIPAL user/role administration
```

---

## 4. Domain Model

### 4.1 `User` (table `USERS`)

```
UUID       id            // PK — NOT auto-generated; set from the *-created event's / seed UUID
String     username      // unique, not null, len 100
String     password      // BCrypt hash, not null
String     email         // nullable, non-unique, len 200 (null for phone-only parent logins)
String     phone         // nullable, len 30 (carried for downstream consumers e.g. notification-service)
String     status        // len 20, default "ACTIVE"
Instant    createdAt     // default now()
Instant    updatedAt     // default now()
Set<Role>  roles         // @ManyToMany EAGER via USER_ROLES join table
```

### 4.2 `Role` (table `ROLES`)

```
UUID    id     // @GeneratedValue UUID
String  name   // unique, not null, len 50 (ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT)
```

### 4.3 `RefreshToken` (table `REFRESH_TOKENS`)

```
UUID     id          // @GeneratedValue UUID
User     user        // @ManyToOne LAZY, USER_ID not null
String   token       // unique, not null, len 500 (random UUID string)
Instant  expiryDate  // not null
```

One token per user — creating a new one deletes existing tokens for that user.

### 4.4 `PasswordResetToken` (table `PASSWORD_RESET_TOKENS`)

```
UUID     id          // @GeneratedValue UUID
User     user        // @ManyToOne LAZY, USER_ID not null
String   token       // unique, not null, len 200 (random UUID string)
Instant  expiryDate  // not null (1 hour after issue)
boolean  used        // default false
```

### 4.5 `AuditLog` (table `AUDIT_LOGS`)

```
UUID     id          // @GeneratedValue UUID
String   username    // not null, len 100
String   action      // not null, len 100 (LOGIN, LOGOUT, LOGIN_FAILED, CHANGE_PASSWORD,
                     //   CHANGE_PASSWORD_FAILED, RESET_PASSWORD, UPDATE_USER_STATUS, UPDATE_USER_ROLES)
String   detail      // TEXT, nullable
String   ipAddress   // len 50, nullable (from X-Forwarded-For or remote addr)
boolean  success     // not null
Instant  occurredAt  // not null, default now()
```

---

## 5. Database Schema

JPA runs with `ddl-auto: validate` — the schema below (Flyway
`db/migration/V1__init_auth_schema.sql`) is the source of truth and must match the
entity mappings.

```sql
-- Auth service schema (auth_db). Matches JPA entities under ddl-auto=validate.
-- EMAIL is nullable and non-unique: auto-created parent logins have no email (their identity
-- is the phone number, used as USERNAME). PHONE is carried for downstream consumers
-- (e.g. notification-service). Uniqueness of EMAIL is a service-layer concern.

CREATE TABLE ROLES (
    ID   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    NAME VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE USERS (
    ID         UUID PRIMARY KEY,
    USERNAME   VARCHAR(100) NOT NULL UNIQUE,
    PASSWORD   VARCHAR(255) NOT NULL,
    EMAIL      VARCHAR(200),
    PHONE      VARCHAR(30),
    STATUS     VARCHAR(20)  DEFAULT 'ACTIVE',
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE USER_ROLES (
    USER_ID UUID NOT NULL,
    ROLE_ID UUID NOT NULL,
    PRIMARY KEY (USER_ID, ROLE_ID),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (ROLE_ID) REFERENCES ROLES (ID) ON DELETE CASCADE
);

CREATE TABLE REFRESH_TOKENS (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_ID     UUID NOT NULL,
    TOKEN       VARCHAR(500) NOT NULL UNIQUE,
    EXPIRY_DATE TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE TABLE PASSWORD_RESET_TOKENS (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_ID     UUID NOT NULL,
    TOKEN       VARCHAR(200) NOT NULL UNIQUE,
    EXPIRY_DATE TIMESTAMP WITH TIME ZONE NOT NULL,
    USED        BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE INDEX idx_prt_token ON PASSWORD_RESET_TOKENS (TOKEN);

CREATE TABLE AUDIT_LOGS (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USERNAME    VARCHAR(100) NOT NULL,
    ACTION      VARCHAR(100) NOT NULL,
    DETAIL      TEXT,
    IP_ADDRESS  VARCHAR(50),
    SUCCESS     BOOLEAN NOT NULL,
    OCCURRED_AT TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_audit_username ON AUDIT_LOGS (USERNAME);
CREATE INDEX idx_audit_occurred_at ON AUDIT_LOGS (OCCURRED_AT DESC);

-- Roles are required by the Kafka consumer (resolveRoles) in EVERY profile, so they are
-- seeded here in the base migration rather than in the dev-only data seed.
INSERT INTO ROLES (ID, NAME) VALUES
    ('00000000-0000-0000-0005-000000000001', 'ADMIN'),
    ('00000000-0000-0000-0005-000000000002', 'PRINCIPAL'),
    ('00000000-0000-0000-0005-000000000003', 'TEACHER'),
    ('00000000-0000-0000-0005-000000000004', 'STUDENT'),
    ('00000000-0000-0000-0005-000000000005', 'PARENT')
ON CONFLICT (NAME) DO NOTHING;
```

---

## 6. REST API

All endpoints are mounted under the base path `/auth` (`@RestController`). Responses
are wrapped in the common `ApiResponse<T>` envelope. Auth column: **Public** = no
token, **Auth** = any authenticated user, **PRINCIPAL** = requires `ROLE_PRINCIPAL`.

| Method | Path                      | Auth      | Description                                             |
|--------|---------------------------|-----------|---------------------------------------------------------|
| POST   | `/auth/login`             | Public    | Authenticate; returns access + refresh tokens + profile |
| POST   | `/auth/refresh`           | Public    | Exchange a refresh token for a new token pair           |
| POST   | `/auth/forgot-password`   | Public    | Request a password-reset token (emailed via Kafka)      |
| POST   | `/auth/reset-password`    | Public    | Reset password using a valid reset token                |
| POST   | `/auth/logout`            | Auth      | Delete the caller's refresh token(s)                    |
| POST   | `/auth/change-password`   | Auth      | Change password after verifying current password        |
| GET    | `/auth/me`                | Auth      | Return the caller's id, username, email, roles, status  |
| GET    | `/auth/audit-logs`        | PRINCIPAL | Paged audit log, optionally filtered by `username`      |
| GET    | `/auth/users`             | PRINCIPAL | Paged list of all users                                 |
| GET    | `/auth/users/{id}/roles`  | PRINCIPAL | Role names for a user                                   |
| PATCH  | `/auth/users/{id}/status` | PRINCIPAL | Update a user's account status                          |
| PUT    | `/auth/users/{id}/roles`  | PRINCIPAL | Replace all roles for a user                            |

### Request body examples

`POST /auth/login`

```json
{
  "username": "principal",
  "password": "Admin@1234"
}
```

`POST /auth/reset-password`

```json
{
  "token": "b0e2c6f1-8f3a-4a1e-9c2d-3d4e5f6a7b8c",
  "newPassword": "NewPass@123"
}
```

`POST /auth/change-password`

```json
{
  "currentPassword": "Admin@1234",
  "newPassword": "NewPass@123"
}
```

Successful `POST /auth/login` response (`ApiResponse` envelope):

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

---

## 7. Service Logic

| Flow | Behaviour |
|------|-----------|
| **Login** (`AuthService.login`) | Reject early if the username is currently locked (403 with seconds remaining). Look up the user; if not found or password mismatch → record a failed attempt, write a `LOGIN_FAILED` audit row, throw 400 "Invalid credentials". If status is not `ACTIVE` → record failure, `LOGIN_FAILED` audit, throw 403 "Account is not active". On success: clear attempts, issue a JWT (username + role names), create a fresh refresh token, write a `LOGIN` audit row, return the token pair + profile. |
| **Lockout** (`LoginAttemptService`) | In-memory `ConcurrentHashMap` per username. `MAX_ATTEMPTS = 5`; on the 5th failure the account is locked for `LOCK_DURATION_SECONDS = 900` (15 minutes). A successful login clears the counter; the lock auto-clears once the window elapses. State is per-instance and not shared across replicas or restarts. |
| **Refresh** (`AuthService.refresh` / `RefreshTokenService`) | Look up the refresh token (400 if unknown), verify it has not expired (deletes + 400 if expired), then issue a new access token and a new refresh token. `createRefreshToken` deletes any existing tokens for the user first, so a user has a single active refresh token (per-device tokens / true rotation are not implemented). Default refresh lifetime `604800000 ms` (7 days), configurable via `app.jwt.refresh-expiration-ms`. |
| **Logout** | Delete all refresh tokens for the user and write a `LOGOUT` audit row. |
| **Change password** | Verify the current password; on mismatch write `CHANGE_PASSWORD_FAILED` and throw 400. On success re-encode with BCrypt, bump `updatedAt`, write `CHANGE_PASSWORD`. |
| **Forgot password** (`PasswordResetService.initiateReset`) | Silent for unknown emails (no enumeration). For a known email: delete prior reset tokens, create a new one (random UUID, 1-hour expiry), and publish a `NotificationRequestEvent` (channel `EMAIL`) to `notification-request` carrying the raw token. |
| **Reset password** | Look up the token (400 if unknown), reject if already used or expired, re-encode the password, mark the token `used`, and write a `RESET_PASSWORD` audit row (username resolved from the token, best-effort). |
| **User admin** (`UserManagementService`) | PRINCIPAL-only. `findAll` pages users → `UserSummaryResponse`. `updateStatus` sets status + audits `UPDATE_USER_STATUS` (old → new). `getUserRoles` returns role names. `updateRoles` resolves each role name (400 if unknown), replaces the user's role set, and audits `UPDATE_USER_ROLES`. |

### Security configuration (`SecurityConfig`)

- CSRF disabled; session policy `STATELESS`.
- Public (no JWT): `/auth/login`, `/auth/refresh`, `/auth/forgot-password`,
  `/auth/reset-password`, plus `/swagger-ui/**`, `/v3/api-docs/**`, `/actuator/**`.
- `hasRole("PRINCIPAL")`: `/auth/audit-logs`, `/auth/users/**`.
- All other requests require authentication.
- `JwtAuthenticationFilter` (from common-library) runs before
  `UsernamePasswordAuthenticationFilter`. Password encoder is `BCryptPasswordEncoder`.

---

## 8. Kafka Consumers

Consumer group: **`auth-service-group`**. Listener container factory
`kafkaListenerContainerFactory`; values are deserialized as `LinkedHashMap` then
mapped via Jackson to the event type. Each handler first validates that the event
carries a required identity (non-null id and a non-blank username); a missing identity
throws `IllegalArgumentException`. On success the new `User` is persisted **with the id
carried in the event**, so the auth account shares the same UUID as the source record.
If a username already exists the message is skipped (idempotent).

Errors are handled by a `DefaultErrorHandler` with a `DeadLetterPublishingRecoverer`:
after 2 retries (no backoff) a failing record is published to `<topic>.DLT` (e.g.
`student-created.DLT`) so a malformed or unprovisionable event does not block the
partition.

| Topic             | Event                 | Action                                                                                       |
|-------------------|-----------------------|----------------------------------------------------------------------------------------------|
| `student-created` | `StudentCreatedEvent` | Create `User` (id = `studentId`); roles from event or default `[STUDENT]`; encode temp password |
| `teacher-created` | `TeacherCreatedEvent` | Create `User` (id = `teacherId`); roles from event or default `[TEACHER]`; encode temp password |
| `parent-created`  | `ParentCreatedEvent`  | Create `User` (id = `parentId`); roles from event or default `[PARENT]`; encode temp password  |

Producer: the service also publishes `NotificationRequestEvent` to
`notification-request` from the forgot-password flow (see §7). This is the only
producer. Topic constants live in `common-library/events/KafkaTopics.java` (hyphenated
names such as `student-created`, `notification-request`).

---

## 9. Migrations

Flyway location `classpath:db/migration` for all profiles; the `docker` profile adds
`classpath:db/seed`.

- **`db/migration/V1__init_auth_schema.sql`** — schema (roles, users, join table,
  refresh tokens, password-reset tokens, audit logs + indexes) **plus the 5 role rows**
  (ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT), which the Kafka consumer needs in every
  profile. See §5.
- **`db/seed/V2__seed_dev_data.sql`** — profile-gated dev seed, loaded only under the
  `docker` profile. Idempotent (`ON CONFLICT ... DO NOTHING`). Inserts 8 login users and
  their `USER_ROLES` mappings (roles themselves come from V1). All seeded users share the
  BCrypt hash `$2a$10$tfXCZWMTBa8t03.d/TajOOYcWT9PnaRrb6ufOW4k.tjaoPV2R3qKy` (password
  `Admin@1234`). Teacher/parent rows carry a PHONE; students have none. The parent login's
  **username is its phone number** (`9100000002`), matching the phone-as-identity model.

Seed accounts:

| Username     | UUID                                   | Role      |
|--------------|----------------------------------------|-----------|
| principal    | `00000000-0000-0000-0001-000000000001` | PRINCIPAL |
| teacher1     | `00000000-0000-0000-0002-000000000001` | TEACHER   |
| teacher2     | `00000000-0000-0000-0002-000000000002` | TEACHER   |
| student1     | `00000000-0000-0000-0003-000000000001` | STUDENT   |
| student2     | `00000000-0000-0000-0003-000000000002` | STUDENT   |
| student3     | `00000000-0000-0000-0003-000000000003` | STUDENT   |
| student4     | `00000000-0000-0000-0003-000000000004` | STUDENT   |
| `9100000002` | `00000000-0000-0000-0004-000000000001` | PARENT    |

> **Security note:** the seed accounts and their shared password are for local/Docker
> testing only and must be removed or rotated before any production deployment.
