# Config Server — PRD

## Overview

The config-server centralizes runtime configuration for every Art Academy
service so environment-specific settings live in one place instead of being
duplicated across service builds. Clients fetch their configuration at
startup.

## Goals

- Serve per-service configuration from a classpath `native` backend.
- Serve shared cross-cutting defaults (JWT secret, Eureka, Kafka bootstrap)
  to all services as a common base layer.
- Register with Eureka so clients can discover it.

## Non-Goals

- No Git- or Vault-backed configuration (classpath `native` only).
- No business logic, database, or Kafka messaging.

## Requirements

| # | Requirement |
| --- | --- |
| R1 | Run a Spring Cloud Config Server on port 8888 in the `native` profile. |
| R2 | Serve config from `classpath:config/*.yml`. |
| R3 | Provide a shared `application.yml` baseline plus one document per business service (auth, user, course-enrollment, attendance, payment, notification, reporting). |
| R4 | Expose `/health`, `/info`, and `/refresh`. |
| R5 | Register with Eureka. |

## Success Criteria

- Each service boots with the port, datasource, and shared defaults served
  by the config-server.
- Configuration changes are made in one place and picked up by clients.
