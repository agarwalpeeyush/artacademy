# Service Registry — Design

## Overview

The service-registry is the Eureka discovery server for the Art Academy
platform. Every other service registers here on startup and looks up peers
by logical name (`lb://<service>`), so no service hardcodes another's host
or port. Built on Spring Boot 3.3.4 / Java 21 / Spring Cloud 2023.0.3.

## Responsibilities

- Provide service discovery for all platform services.
- Maintain the live registry of running instances (host, port, health).
- Act as the discovery backbone the API Gateway and inter-service clients
  resolve `lb://` URIs against.

## Configuration

| Property | Value |
| --- | --- |
| Port | 8761 |
| Application type | Eureka server (`@EnableEurekaServer`) |
| `register-with-eureka` | `false` |
| `fetch-registry` | `false` |
| Default zone | `http://localhost:8761/eureka/` |
| Database | none |
| Kafka | none |

Because the registry is itself the source of truth, it neither registers
with nor fetches from any other Eureka node.

## Endpoints

| Path | Purpose |
| --- | --- |
| `/health` | Liveness / readiness probe |
| `/info` | Build and runtime info |
| `/eureka/**` | Eureka client registration and lookup protocol |

## Operational Notes

- Start the registry first; other services need it available to register.
- It holds no persistent state — the registry is rebuilt from client
  heartbeats after a restart.
- See the root `../DESIGN.md` for the platform-wide topology.
