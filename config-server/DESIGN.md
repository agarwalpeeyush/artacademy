# Config Server — Design

## Overview

The config-server is the centralized configuration source for the Art
Academy platform. It runs as a Spring Cloud Config Server in the `native`
profile, serving YAML files bundled on its own classpath (`config/*.yml`)
rather than from a Git backend. Built on Spring Boot 3.3.4 / Java 21 /
Spring Cloud 2023.0.3. It registers with Eureka as a client.

## Configuration

| Property | Value |
| --- | --- |
| Port | 8888 |
| Application type | Spring Cloud Config Server |
| Active profile | `native` (classpath backend) |
| Served location | `classpath:config/*.yml` |
| Eureka | registers as client |
| Database | none |

## Served Configuration Files

| File | Role |
| --- | --- |
| `application.yml` | Shared baseline: JWT secret, Eureka client, Kafka bootstrap |
| `auth-service.yml` | auth-service config |
| `user-service.yml` | user-service config |
| `course-enrollment-service.yml` | course-enrollment-service config |
| `attendance-service.yml` | attendance-service config |
| `payment-service.yml` | payment-service config |
| `notification-service.yml` | notification-service config |
| `reporting-service.yml` | reporting-service config |

The shared `application.yml` is the base layer merged under every
per-service document, so cross-cutting defaults (JWT, Eureka, Kafka
bootstrap) are defined once and inherited by all clients.

## Endpoints

| Path | Purpose |
| --- | --- |
| `/health` | Liveness / readiness probe |
| `/info` | Build and runtime info |
| `/refresh` | Trigger a configuration refresh |
| `/{application}/{profile}` | Serve merged property sources to a client |

## Operational Notes

- Start after the service-registry and before the business services that
  import config from it.
- Holds no database and no client state — configuration is read from the
  classpath.
- See the root `../DESIGN.md` for the platform-wide topology.
