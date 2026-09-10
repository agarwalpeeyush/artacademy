# API Gateway — Testing Guide

Base URL: **`http://localhost:8080`** (local) · **`http://localhost:18080`** (Docker host).

All examples below assume the local base URL; substitute `:18080` when running against Docker.

## Prerequisites

- **service-registry** (Eureka) running on `:8761` with the target downstream services registered.
- **Redis** running (default `:6379`) for the rate limiter.
- A valid JWT obtained from `auth-service` via `POST /auth/login`.

## Scenario Matrix

| # | Scenario | Request | Expected result |
| --- | --- | --- | --- |
| 1 | Unauthenticated request to a protected route | `GET /students` with no `Authorization` header | `401 Unauthorized` (JwtAuth filter short-circuits before routing) |
| 2 | Public auth route passes through without a token | `POST /auth/login` (no token) | Request reaches `auth-service`; normal login response (e.g. `200` with JWT, or `401` on bad credentials — not a gateway rejection) |
| 3 | Valid JWT reaches downstream | `GET /students` with `Authorization: Bearer <valid>` | Routed to `user-service`; downstream receives `X-Auth-User` and `X-Auth-Roles` headers; response from the service |
| 4 | Invalid / expired JWT | `GET /students` with `Authorization: Bearer <garbage>` | `401 Unauthorized`; WARN log "Invalid JWT" on the gateway |
| 5 | Malformed Authorization header (no `Bearer ` prefix) | `GET /courses` with `Authorization: xyz` | `401 Unauthorized` |
| 6 | CORS preflight | `OPTIONS /students` with `Origin` and `Access-Control-Request-Method` headers | `200`/`204` with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` |
| 7 | Rate limit — burst beyond capacity | Fire >200 requests in a burst from one IP faster than 100/s replenish | Excess requests return `429 Too Many Requests` |
| 8 | Unknown route | `GET /does-not-exist` | `404 Not Found` (no matching predicate) |
| 9 | Route resolves via Eureka | `GET /timetables` with valid JWT while `timetable-service` is registered | Routed successfully; if the target is deregistered, expect `503 Service Unavailable` |
| 10 | Actuator route introspection | `GET /actuator/gateway/routes` | `200` with the live route definitions |

## Example Commands

Obtain a token:

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"principal","password":"password"}'
```

Protected call without token (expect 401):

```bash
curl -i http://localhost:8080/students
```

Protected call with token (expect downstream 200):

```bash
TOKEN=<paste-jwt>
curl -i http://localhost:8080/students -H "Authorization: Bearer $TOKEN"
```

CORS preflight (expect Access-Control-Allow-* headers):

```bash
curl -i -X OPTIONS http://localhost:8080/students \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: GET'
```

Rate-limit burst (expect some 429s):

```bash
for i in $(seq 1 400); do \
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/auth/login & \
done; wait
```

Unknown route (expect 404):

```bash
curl -i http://localhost:8080/does-not-exist
```

Inspect live routes:

```bash
curl -s http://localhost:8080/actuator/gateway/routes
```

## Route Coverage Checklist

Verify each mapping routes to the expected service (all except `/auth/**` require a valid JWT):

| Path | Expected service |
| --- | --- |
| `/auth/**` | auth-service (public) |
| `/teachers`, `/students`, `/parents`, `/users` | user-service |
| `/courses`, `/classes`, `/enrollments` | course-enrollment-service |
| `/attendance` | attendance-service |
| `/timetables`, `/rooms` | timetable-service |
| `/fees`, `/payments` | payment-service |
| `/notifications` | notification-service |
| `/reports` | reporting-service |

## Notes

- The gateway validates only authentication. Role-based `403 Forbidden` responses originate from the **downstream** service based on the propagated `X-Auth-Roles` header, not from the gateway.
- Rate-limit outcomes depend on Redis availability and timing; if Redis is down, rate-limited requests fail rather than pass.
