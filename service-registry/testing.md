# Service Registry — Testing Guide

This guide covers manual/functional verification of the Eureka service registry.
The registry has no database, no Kafka, and no business logic, so testing
focuses on discovery behaviour: registration, heartbeat, eviction, the
dashboard, the REST API, and gateway route resolution.

## Prerequisites

- Java 21 and Maven available.
- Start the registry first:
  ```bash
  cd service-registry
  mvn spring-boot:run
  ```
- Registry base URL: `http://localhost:8761`
- Eureka REST API root: `http://localhost:8761/eureka/apps`

## Scenarios

| # | Scenario                     | Steps                                                                                         | Expected result                                                                                          |
|---|------------------------------|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| 1 | Dashboard reachable          | Open `http://localhost:8761` in a browser after the registry starts.                          | Eureka dashboard loads and renders. With no clients running, "Instances currently registered" is empty.  |
| 2 | Service appears on register  | Start a client service (e.g. `api-gateway`), then refresh the dashboard within the heartbeat window (~30s). | The service's application name appears under "Instances currently registered" with status `UP`.          |
| 3 | Heartbeat keeps it listed    | Leave a registered service running and refresh the dashboard periodically.                    | The instance stays `UP`; the "renews (last min)" counter increases as heartbeats arrive.                 |
| 4 | Service evicted on stop      | Stop a registered service (Ctrl+C). Wait through the heartbeat-expiry / eviction window.      | The instance eventually disappears from the registry. Note: with default self-preservation on, eviction may be delayed and the dashboard may show a self-preservation warning. |
| 5 | REST API lists apps          | `GET http://localhost:8761/eureka/apps` (add `Accept: application/json` for JSON).            | Returns the list of registered applications and their instances. Empty (`applications` with no `application`) when nothing is registered. |
| 6 | REST API single app          | `GET http://localhost:8761/eureka/apps/API-GATEWAY` while the gateway is registered.          | Returns that application's instance details (host, port, status `UP`).                                   |
| 7 | Gateway resolves `lb://`      | With registry + `api-gateway` + a target service (e.g. `user-service`) all `UP`, call a gateway route mapped to `lb://user-service`. | The gateway resolves the logical name via the registry and proxies to the live instance (2xx / expected downstream response). |
| 8 | Registry-only, no self-register | `GET http://localhost:8761/eureka/apps` right after starting only the registry.             | The `service-registry` does **not** appear as a registered app (`register-with-eureka=false`).           |
| 9 | Actuator health              | `GET http://localhost:8761/actuator/health`.                                                  | Returns `{"status":"UP"}`.                                                                                |
| 10| Actuator info                | `GET http://localhost:8761/actuator/info`.                                                    | Returns HTTP 200 (JSON, possibly empty `{}`).                                                            |

## Example commands

```bash
# Dashboard (browser)
open http://localhost:8761

# Full registry as JSON
curl -H "Accept: application/json" http://localhost:8761/eureka/apps

# A specific registered application
curl -H "Accept: application/json" http://localhost:8761/eureka/apps/API-GATEWAY

# Actuator
curl http://localhost:8761/actuator/health
curl http://localhost:8761/actuator/info
```

## Notes

- **Application names are upper-cased** in the Eureka REST paths
  (`/eureka/apps/API-GATEWAY`), even though `spring.application.name` is
  lower-case.
- **Eviction timing** is governed by Eureka's lease-expiration and
  self-preservation defaults; a stopped service may linger briefly before it is
  removed.
- **In-memory only** — restarting the registry clears all registrations; clients
  re-register on their next heartbeat.
- **Start order** — the registry must be up before starting the services under
  test, otherwise clients retry registration until it is reachable.
