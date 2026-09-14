# API Gateway — PRD

## Overview

The api-gateway provides a single, secure entry point for all client
traffic to the Art Academy platform, centralizing routing, JWT
authentication, CORS, and rate limiting so services can focus on domain
logic and their own fine-grained authorization.

## Goals

- Route requests by path to the correct backend via Eureka (`lb://`).
- Validate Bearer JWTs on protected routes and forward caller identity.
- Apply global CORS and a global request rate limit.

## Non-Goals

- Token issuance / login (owned by auth-service via public `/auth/**`).
- Per-endpoint role authorization (owned by each downstream service).
- Business logic, persistence, or data models.

## Requirements

| # | Requirement |
| --- | --- |
| R1 | Serve as the entry point on port 8080 (18080 on the Docker host). |
| R2 | Route by path to user, course-enrollment, attendance, payment, notification, and reporting services, plus public `/auth/**`. |
| R3 | Validate JWTs on protected routes; return 401 on failure. |
| R4 | Inject `X-Auth-User` and `X-Auth-Roles` headers downstream on success. |
| R5 | Apply global CORS (all origins/methods/headers). |
| R6 | Enforce a Redis-backed rate limit (replenishRate 100, burstCapacity 200, requestedTokens 1). |
| R7 | Register with Eureka and load-balance across instances. |

## Success Criteria

- Requests reach the correct backend without prefix stripping.
- Missing or invalid tokens are rejected before reaching downstream.
- Downstream services receive verified identity headers.
