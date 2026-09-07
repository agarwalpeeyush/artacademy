# API Gateway — Detail Design Document

## 1. Overview

The `api-gateway` is the single entry point for all client traffic. It is built on Spring Cloud Gateway (reactive, Netty-based) and performs three cross-cutting functions: JWT authentication, rate limiting, and request routing to the appropriate downstream microservice via Eureka service discovery.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `api-gateway` |
| Package root | `com.artacademy.gateway` |
| Server port | **8080** (local/dev) · **18080** Docker host-mapped (`18080:8080`) |

---

## 3. Component Structure

```
com.artacademy.gateway
└── filter
    └── JwtAuthGatewayFilterFactory.java
```

```
resources/
└── application.yml
```

---

## 4. JWT Authentication Filter

### `JwtAuthGatewayFilterFactory`

A custom `AbstractGatewayFilterFactory` named `JwtAuth`. It is applied to every route except `/auth/**`.

**Filter logic:**

```
1. Extract Authorization header.
2. If missing or not "Bearer ...", return 401 Unauthorized.
3. Call JwtUtil.validateToken(token).
4. If invalid, return 401 Unauthorized.
5. Extract username   → add request header X-Auth-User.
6. Extract roles list → add request header X-Auth-Roles (comma-separated).
7. Forward mutated request to downstream service.
```

Downstream services read `X-Auth-User` and `X-Auth-Roles` to populate the security context without re-validating the token signature (the gateway is the trust boundary).

---

## 5. Route Configuration

All routes use Spring Cloud Gateway's Eureka-aware `lb://` URIs for client-side load balancing.

### 5.1 Public Routes (no auth filter)

| Path pattern | Upstream service |
|--------------|-----------------|
| `/auth/**` | `lb://auth-service` |

### 5.2 Protected Routes (JwtAuth filter applied)

| Path pattern | Upstream service |
|--------------|-----------------|
| `/teachers/**` | `lb://user-service` |
| `/students/**` | `lb://user-service` |
| `/courses/**` | `lb://course-enrollment-service` |
| `/classes/**` | `lb://course-enrollment-service` |
| `/enrollments/**` | `lb://course-enrollment-service` |
| `/attendance/**` | `lb://attendance-service` |
| `/schedules/**` | `lb://scheduling-service` |
| `/fees/**` | `lb://payment-service` |
| `/payments/**` | `lb://payment-service` |
| `/notifications/**` | `lb://notification-service` |
| `/reports/**` | `lb://reporting-service` |

---

## 6. Rate Limiting

Redis-backed `RequestRateLimiter` filter is applied globally.

| Parameter | Value |
|-----------|-------|
| `replenishRate` | 100 requests / second |
| `burstCapacity` | 200 requests |
| `keyResolver` | Remote IP address |

Dependency: `spring-boot-starter-data-redis-reactive`.  
Redis is expected at `redis://localhost:6379` (configured via Config Server).

When the rate limit is exceeded, the gateway returns **429 Too Many Requests**.

---

## 7. CORS Configuration

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins: "*"
            allowedMethods: "*"
            allowedHeaders: "*"
```

This permits all origins during development. In production, `allowedOrigins` should be restricted to the frontend domain.

---

## 8. Header Propagation to Downstream Services

| Header added by gateway | Content |
|-------------------------|---------|
| `X-Auth-User` | JWT `sub` claim (username) |
| `X-Auth-Roles` | Comma-separated list of role names, e.g. `PRINCIPAL,TEACHER` |

Downstream services use `JwtAuthenticationFilter` (from common-library) to parse these headers and set up the `SecurityContext` without a database call.

---

## 9. Dependencies

```xml
<dependency>spring-cloud-starter-gateway</dependency>
<dependency>spring-cloud-starter-netflix-eureka-client</dependency>
<dependency>spring-cloud-starter-config</dependency>
<dependency>spring-boot-starter-data-redis-reactive</dependency>
<dependency>jjwt-api/impl/jackson (v0.12.6)</dependency>
```

---

## 10. Security Notes

- The JWT secret is loaded from Config Server (`${jwt.secret}`), identical to the one used by `auth-service` to sign tokens.
- No session state is stored; the gateway is fully stateless.
- The Eureka client uses `preferIpAddress: true` for container-friendly registration.
