# Service Registry — Product Requirements Document

## Purpose

Provide a single, authoritative **service-discovery registry** for the Art
Academy microservices platform. The Service Registry (a Netflix Eureka server)
lets every service register itself and discover the network locations of other
services at runtime, removing the need for hard-coded hostnames/ports and
enabling the API gateway to route by logical service name (`lb://`).

## Scope

**In scope**

- Running a Eureka server on port **8761**.
- Accepting registration, renewal (heartbeat), and de-registration from client
  services.
- Serving the Eureka dashboard (`http://localhost:8761`) and the Eureka REST
  API (`/eureka/apps`).
- Exposing Actuator `health` and `info` endpoints.

**Out of scope**

- Persistence of the registry (registry is in-memory only).
- Multi-node Eureka peer replication / high-availability cluster (single node
  today).
- Any business logic, database, or messaging (no DB, no Kafka).
- Client-side load-balancing logic (that lives in the consuming services /
  gateway).

## Functional Requirements

| ID       | Requirement                                                                                       | Priority |
|----------|---------------------------------------------------------------------------------------------------|----------|
| REG-01   | Run a Netflix Eureka server on port 8761 (`@EnableEurekaServer`).                                  | Must     |
| REG-02   | Allow client services to **register** at `http://localhost:8761/eureka/`.                         | Must     |
| REG-03   | Accept periodic **heartbeats** (renewals) from registered instances to track liveness.            | Must     |
| REG-04   | **Evict** instances that stop sending heartbeats (subject to self-preservation).                  | Must     |
| REG-05   | Serve the Eureka **dashboard** UI at `http://localhost:8761` listing registered instances.        | Must     |
| REG-06   | Expose the Eureka **REST API** (e.g. `GET /eureka/apps`) returning registered applications.       | Must     |
| REG-07   | Do **not** register with, or fetch a registry from, any peer (`register-with-eureka=false`, `fetch-registry=false`). | Must     |
| REG-08   | Expose Actuator `health` and `info` endpoints for basic operational monitoring.                   | Should   |
| REG-09   | Become ready to serve immediately on startup (`wait-time-in-ms-when-sync-empty=0`).               | Should   |

## Non-Functional Requirements

| Category         | Requirement                                                                                          |
|------------------|------------------------------------------------------------------------------------------------------|
| Availability     | Single registry node today — a single point of discovery. If it is down, new registrations and fresh `lb://` resolution fail; already-cached clients degrade gracefully until their cache expires. HA (Eureka peer cluster) is a future enhancement. |
| Startup order    | Must start **first**, before all other services.                                                     |
| Performance      | Discovery lookups are served from in-memory registry state; no I/O to a DB.                          |
| Statefulness     | Registry state is **not persisted** — a restart clears the registry until clients re-register.       |
| Observability    | Actuator `health` / `info`; Eureka dashboard for visual inspection of instances.                     |
| Security         | No authentication on the registry/dashboard in the current local configuration.                      |

## Dependencies

**None.** The Service Registry is **foundational**: it has no database, no
Kafka, and no dependency on any other service. Every other service depends on
it, not the other way around. It is the first module to start.
