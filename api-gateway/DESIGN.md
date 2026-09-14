# API Gateway — Design

## Overview

The api-gateway is the single public entry point for the Art Academy
platform. Built on Spring Cloud Gateway (Spring Boot 3.3.4 / Java 21 /
Spring Cloud 2023.0.3), it routes requests to backend services resolved
through Eureka (`lb://`), validates JWTs on protected routes, applies global
CORS, and enforces a Redis-backed rate limit. Fine-grained authorization is
delegated to each downstream service.

## Deployment

| Property | Value |
| --- | --- |
| Port (local) | 8080 |
| Port (Docker) | container 8080, host-mapped to 18080 |
| Eureka | registers as client (`prefer-ip-address=true`) |

## Routing Table

Routes do NOT strip the path prefix. Every downstream URI is a
load-balanced Eureka reference (`lb://`).

| Path predicate | Downstream | JWT filter |
| --- | --- | --- |
| `/auth/**` | auth-service | No (public) |
| `/teachers`, `/students`, `/parents`, `/users/**` | user-service | Yes |
| `/courses`, `/course-types`, `/enrollments`, `/timetables`, `/exams/**` | course-enrollment-service | Yes |
| `/attendance/**` | attendance-service | Yes |
| `/fees`, `/payments/**` | payment-service | Yes |
| `/notifications/**` | notification-service | Yes |
| `/reports/**` | reporting-service | Yes |

## Cross-Cutting Filters

### JWT Validation (`JwtAuthGatewayFilterFactory`)

- Reads the `Authorization` header; requires a `Bearer` token.
- Validates the signature using `app.jwt.secret`.
- On success, injects `X-Auth-User` and `X-Auth-Roles` headers for the
  downstream service.
- On a missing or invalid token, responds `401 Unauthorized` without
  calling downstream.

### Global CORS

- Applied to all paths: all origins, methods, and headers allowed.

### Rate Limiting

- Redis-backed `RequestRateLimiter` applied globally.

| Parameter | Value |
| --- | --- |
| `replenishRate` | 100 |
| `burstCapacity` | 200 |
| `requestedTokens` | 1 |

## Operational Notes

- Requires Eureka (route resolution) and Redis (rate limiting).
- The `/auth/**` route is intentionally public so clients can authenticate.
- See the root `../DESIGN.md` for the platform-wide topology.
