# Service Registry (Eureka) — Detail Design Document

## 1. Overview

The **Service Registry** is the service-discovery backbone of the Art Academy
microservices platform. It is a **Netflix Eureka server** (Spring Cloud
Netflix) that maintains a live registry of every running service instance.
Client services register themselves at startup, send periodic heartbeats to
prove liveness, and query the registry to resolve logical service names into
physical host/port endpoints. This is what allows the API gateway to route
`lb://<service-name>` URIs and lets services call one another without
hard-coded addresses. No business logic lives here.

- Framework: Spring Boot 3.3.4, Spring Cloud Netflix Eureka Server
- Language / runtime: Java 21
- Role: Eureka **server** only — it does **not** register with any other
  registry and does **not** fetch a remote registry (it *is* the registry).
- Persistence: **none** — the registry is held entirely in memory.
- Messaging: **none** — no Kafka, no database.
- Dashboard / REST: Eureka dashboard and REST API served on port **8761**.

## 2. Module Coordinates

| Attribute        | Value                                                            |
|------------------|------------------------------------------------------------------|
| ArtifactId       | `service-registry`                                               |
| Parent           | `com.artacademy:artacademy-platform:1.0.0-SNAPSHOT`              |
| Module name      | `Service Registry`                                               |
| Package root     | `com.artacademy.serviceregistry`                                 |
| Application name | `service-registry` (`spring.application.name`)                   |
| Server port      | `8761`                                                           |
| Database         | none                                                             |
| Messaging        | none (no Kafka)                                                  |
| Key dependencies | `spring-cloud-starter-netflix-eureka-server`, `spring-boot-starter-actuator` |

## 3. Component Structure

The module is intentionally minimal — a single bootstrap class plus
configuration.

| Component                          | Path                                                                                  | Responsibility                                                        |
|------------------------------------|---------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| `ServiceRegistryApplication`       | `src/main/java/com/artacademy/serviceregistry/ServiceRegistryApplication.java`        | Spring Boot entry point; enables the Eureka server via `@EnableEurekaServer`. |
| `application.yml`                  | `src/main/resources/application.yml`                                                  | Port, Eureka instance/client/server config, actuator exposure.        |
| `pom.xml`                          | `pom.xml`                                                                              | Declares the Eureka server + actuator starters.                       |

### 3.1 Application class

```java
package com.artacademy.serviceregistry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication {
    public static void main(String[] args) {
        SpringApplication.run(ServiceRegistryApplication.class, args);
    }
}
```

`@EnableEurekaServer` activates the embedded Eureka server auto-configuration
and its endpoints (`/eureka/*`, dashboard at `/`). No custom beans,
controllers, or persistence code exist in this module.

## 4. Configuration

The complete `application.yml`:

```yaml
server:
  port: 8761

spring:
  application:
    name: service-registry

eureka:
  instance:
    hostname: localhost
  client:
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
  server:
    wait-time-in-ms-when-sync-empty: 0

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

### 4.1 Setting-by-setting

| Property                                       | Value                                             | Meaning                                                                                                   |
|------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `server.port`                                  | `8761`                                            | Standard Eureka port; dashboard + REST API listen here.                                                   |
| `spring.application.name`                      | `service-registry`                                | Logical service name.                                                                                     |
| `eureka.instance.hostname`                     | `localhost`                                       | Host advertised in the self-referencing `defaultZone` URL.                                                |
| `eureka.client.register-with-eureka`           | `false`                                           | The registry does **not** register itself as a client — it is the server, not a discoverable service.     |
| `eureka.client.fetch-registry`                 | `false`                                           | The registry does **not** pull a registry from a peer (single-node topology; nothing to fetch).           |
| `eureka.client.service-url.defaultZone`        | `http://localhost:8761/eureka/`                   | Self-referencing zone URL, resolved from `hostname` + `port`. This is the URL every client registers at.  |
| `eureka.server.wait-time-in-ms-when-sync-empty`| `0`                                               | Skips the startup grace period Eureka normally waits before serving an empty registry — the server becomes ready immediately, useful for fast local startup. |
| `management.endpoints.web.exposure.include`    | `health,info`                                     | Exposes only the Actuator `health` and `info` endpoints.                                                  |

### 4.2 Self-preservation

Self-preservation (`eureka.server.enable-self-preservation`) is **not
explicitly configured**, so the Eureka default (`true`) applies. Under
self-preservation, when the server stops receiving enough heartbeats within a
window it stops evicting instances to avoid dropping a healthy service during a
network partition. On a single local node with few clients this can leave
already-stopped instances listed for a while; it is left at the default here.

## 5. Registered Clients

The registry itself holds no static list of clients — every service registers
dynamically by pointing its own `eureka.client.service-url.defaultZone` at
`http://localhost:8761/eureka/`. On startup a client sends its registration and
then renews via heartbeats (Eureka default: renew every ~30s, lease expires
after ~90s of missed heartbeats). The following platform services register here
(names shown as they appear in Eureka, upper-cased):

| Service (Eureka app name)     | Notes                                                        |
|-------------------------------|--------------------------------------------------------------|
| `CONFIG-SERVER`               | Externalized configuration; registers with Eureka.           |
| `API-GATEWAY`                 | Consumes the registry to resolve `lb://` routes.             |
| `AUTH-SERVICE`                | Authentication / token issuance.                             |
| `USER-SERVICE`                | User profile management.                                     |
| `COURSE-ENROLLMENT-SERVICE`   | Course + enrollment domain.                                  |
| `ATTENDANCE-SERVICE`          | Attendance tracking.                                         |
| `TIMETABLE-SERVICE`           | Timetable generation (publishes `TimetableGeneratedEvent`).  |
| `PAYMENT-SERVICE`             | Payments / billing.                                          |
| `NOTIFICATION-SERVICE`        | Notifications.                                               |
| `REPORTING-SERVICE`           | Reporting / analytics.                                       |

Each of these services acts as a Eureka **client** (registers + fetches),
whereas the registry itself is a server-only node.

## 6. Startup Position

The Service Registry **must start first**, before every other module.

1. **service-registry** (this module) — port 8761.
2. **config-server** — provides externalized config; registers with Eureka.
3. **api-gateway** — resolves `lb://` routes via the registry.
4. All remaining domain services (auth, user, course-enrollment, attendance,
   timetable, payment, notification, reporting).

If a client starts before the registry is up, it will retry registration until
the registry becomes reachable, but discovery-dependent routing (gateway
`lb://` resolution, inter-service calls) will fail until the registry is
available and clients have completed their first heartbeat. In Docker
Compose / Kubernetes, other services declare `depends_on: service-registry` or
use a readiness check against `http://service-registry:8761/actuator/health`.
Starting this module first avoids startup churn.
