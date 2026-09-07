# Auth Service — Detail Design Document

## 1. Overview

The `auth-service` is responsible for user authentication, JWT access token generation, refresh token lifecycle management, and password management. It owns the `users`, `roles`, and `refresh_tokens` tables and is the only service that touches these credentials.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `auth-service` |
| Package root | `com.artacademy.auth` |
| Server port | **8081** (registered in Eureka as `AUTH-SERVICE`) |
| Database | `artacademy_auth` (PostgreSQL) |

---

## 3. Component Structure

```
com.artacademy.auth
├── AuthServiceApplication.java
├── config
│   └── SecurityConfig.java
├── controller
│   └── AuthController.java
├── domain
│   ├── User.java
│   ├── Role.java
│   └── RefreshToken.java
├── dto
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   ├── RefreshTokenRequest.java
│   └── ChangePasswordRequest.java
├── repository
│   ├── UserRepository.java
│   ├── RoleRepository.java
│   └── RefreshTokenRepository.java
└── service
    ├── AuthService.java
    └── RefreshTokenService.java
```

---

## 4. Domain Model

### 4.1 `User`

```
@Entity("users")
UUID         id
String       username        (unique, not null)
String       password        (BCrypt hash)
String       email           (unique)
String       status          (ACTIVE | INACTIVE)
Set<Role>    roles           (ManyToMany EAGER, join table: user_roles)
Instant      createdAt
Instant      updatedAt
```

### 4.2 `Role`

```
@Entity("roles")
UUID    id
String  name   (unique, e.g. PRINCIPAL, TEACHER, STUDENT)
```

**Seed data (V4 migration):**

| Name |
|------|
| `PRINCIPAL` |
| `TEACHER` |
| `STUDENT` |

### 4.3 `RefreshToken`

```
@Entity("refresh_tokens")
UUID        id
User        user       (ManyToOne LAZY)
String      token      (unique UUID string)
Instant     expiryDate
```

---

## 5. Database Schema

Managed by Flyway. Final state after V4 migration:

```sql
CREATE TABLE roles (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username   VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    email      VARCHAR(255) UNIQUE,
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL
);
```

---

## 6. REST API

Base path: `/auth` (public — no JWT filter at gateway)

### `POST /auth/login`

**Request:**
```json
{
  "username": "principal01",
  "password": "secret123"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "refreshToken": "<UUID>",
    "tokenType": "Bearer",
    "id": "<UUID>",
    "username": "principal01",
    "email": "p@example.com",
    "roles": ["PRINCIPAL"]
  }
}
```

**Errors:**
- `400` — validation failure
- `401` — bad credentials
- `403` — account inactive

---

### `POST /auth/refresh`

**Request:**
```json
{ "refreshToken": "<UUID>" }
```

**Response `200 OK`:** Same shape as login response with new `accessToken` and new `refreshToken`.

**Errors:**
- `401` — token not found or expired (old token is deleted on expiry)

---

### `POST /auth/logout`

Requires valid `Authorization: Bearer <token>`.

Deletes all refresh tokens for the authenticated user.

**Response `200 OK`:** `{ "success": true, "message": "Logged out successfully" }`

---

### `POST /auth/change-password`

Requires valid `Authorization: Bearer <token>`.

**Request:**
```json
{
  "currentPassword": "old",
  "newPassword": "newPass123"
}
```

**Validation:** `newPassword` min length 8.

**Errors:**
- `400` — current password incorrect

---

### `GET /auth/me`

Returns the authenticated user's profile (id, username, email, roles).

---

## 7. Service Logic

### `AuthService`

#### `login(LoginRequest)`
1. Load `User` by username; throw `401` if not found.
2. Check `user.status == ACTIVE`; throw `403` if inactive.
3. `BCryptPasswordEncoder.matches(rawPassword, user.password)` — throw `401` on mismatch.
4. Call `JwtUtil.generateToken(username, roles)`.
5. Call `RefreshTokenService.createRefreshToken(user)`.
6. Return `LoginResponse`.

#### `refresh(RefreshTokenRequest)`
1. Call `RefreshTokenService.findByToken(token)`.
2. Call `RefreshTokenService.verifyExpiry(token)` — deletes expired token and throws `401`.
3. Generate new access token and new refresh token.
4. Return `LoginResponse`.

#### `logout(username)`
1. Load user; call `RefreshTokenService.deleteByUser(user)`.

#### `changePassword(username, ChangePasswordRequest)`
1. Load user.
2. Verify `currentPassword` matches stored hash; throw `400` on mismatch.
3. Encode `newPassword` and persist.

#### `getMe(username)`
Returns `LoginResponse` with user profile only (no new tokens).

### `RefreshTokenService`

#### `createRefreshToken(User)`
1. Delete all existing tokens for the user (one-token-per-user policy).
2. Create new `RefreshToken` with `UUID.randomUUID().toString()`.
3. Set expiry to `now() + refreshTokenDurationMs` (from config).
4. Save and return.

#### `verifyExpiry(RefreshToken)`
- If `token.expiryDate.isBefore(Instant.now())`: delete token, throw `ApiException.badRequest("Refresh token expired")`.

---

## 8. Security Configuration

```java
// Permits without JWT
/auth/login
/auth/refresh
/auth/reset-password
/swagger-ui/**
/v3/api-docs/**
/actuator/**

// All other paths require authentication
```

CSRF is disabled. Session management is `STATELESS`. `JwtAuthenticationFilter` is added before `UsernamePasswordAuthenticationFilter`.

---

## 9. Dependencies

In addition to common-library:

```xml
spring-boot-starter-data-jpa
spring-cloud-starter-netflix-eureka-client
spring-cloud-starter-config
postgresql (runtime)
flyway-core
flyway-database-postgresql
springdoc-openapi-starter-webmvc-ui (v2.6.0)
```

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema (BIGSERIAL IDs) |
| V2 | Seed PRINCIPAL, TEACHER, STUDENT roles |
| V3 | Drop and recreate all tables with UUID primary keys |
| V4 | Re-seed roles using `gen_random_uuid()` |
