# API Gateway — Product Requirements Document

## Purpose

Provide a single, secure, load-balanced entry point for all client traffic to the Art Academy microservices platform. The gateway centralizes routing, authentication (JWT validation), CORS, and rate limiting so that individual services can focus on domain logic and fine-grained authorization.

## Scope

**In scope**
- Reverse-proxy routing of HTTP requests to backend services via Eureka service discovery (`lb://`).
- Validation of Bearer JWTs on protected routes and propagation of caller identity/roles to downstream services.
- Global CORS handling.
- Global Redis-backed request rate limiting keyed by client IP.
- Exposure of actuator endpoints (`health`, `info`, `gateway`) for observability.

**Out of scope**
- Token issuance / login / refresh (owned by `auth-service` behind the public `/auth/**` route).
- Fine-grained, per-endpoint role authorization (owned by each downstream service).
- Business logic, persistence, and data models.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| GW-01 | The gateway SHALL act as the single public entry point, exposed on port `8080` (local) and `18080` on the Docker host (`18080:8080`). |
| GW-02 | The gateway SHALL route requests by path predicate to the correct downstream service using Eureka-resolved `lb://` URIs (see routing table in DESIGN.md §4). |
| GW-03 | The gateway SHALL validate the Bearer JWT on all protected routes via the `JwtAuth` filter, rejecting missing/invalid tokens with `401 Unauthorized`. |
| GW-04 | The gateway SHALL leave `/auth/**` public (no JWT filter) so clients can authenticate. |
| GW-05 | On a valid token, the gateway SHALL forward `X-Auth-User` (subject) and `X-Auth-Roles` (comma-separated roles) headers to the downstream service. |
| GW-06 | The gateway SHALL apply global CORS to all paths (`/**`) and correctly answer preflight `OPTIONS` requests. |
| GW-07 | The gateway SHALL enforce a Redis-backed rate limit globally (replenishRate 100/s, burstCapacity 200, requestedTokens 1), keyed by client IP, returning `429 Too Many Requests` when exceeded. |
| GW-08 | The gateway SHALL discover downstream service instances dynamically through the Eureka service registry and load-balance across them. |
| GW-09 | Requests to unmapped paths SHALL result in `404 Not Found`. |
| GW-10 | The gateway SHALL expose actuator endpoints `health`, `info`, and `gateway`. |

## Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| Security | Stateless JWT validation using an HMAC-SHA key from the shared `app.jwt.secret`; no session state stored. Downstream services trusted only over the internal network. CORS `allowedOrigins` should be narrowed from `*` in production. |
| Availability | Stateless and horizontally scalable; relies on Eureka for instance failover and client-side load balancing. Rate limiting protects downstream services from overload. |
| Performance | Reactive, non-blocking Netty stack; single lightweight hop that adds minimal latency (signature verification + header injection). |
| Observability | Actuator `gateway` endpoint exposes live route definitions; invalid-JWT attempts are logged at WARN. |
| Portability | Runs identically local and in Docker; ports and Eureka/Config URIs overridden via environment variables in Docker. |

## Dependencies

| Dependency | Role | Required |
| --- | --- | --- |
| service-registry (Eureka, :8761) | Resolves `lb://` downstream targets and load balances | Yes |
| Redis | Backing store for `RequestRateLimiter` | Yes |
| config-server (:8888) | Optional externalized config import (`optional:`) | Optional |
| auth-service | Issues the JWTs the gateway validates; served via public `/auth/**` | Yes (functional) |
| Downstream services (user, course-enrollment, attendance, timetable, payment, notification, reporting) | Receive routed traffic; must register in Eureka | Yes (per route) |
