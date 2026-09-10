# Config Server — Detail Design Document

## 1. Overview

The Config Server is the centralized configuration source for the Art Academy
microservices platform. It is a Spring Cloud Config Server (Spring Boot 3.3.4,
Java 21) running in the `native` profile, which serves configuration from files
bundled on its own classpath rather than from a Git backend.

Every business service (auth, user, course-enrollment, attendance, timetable,
payment, notification, reporting) fetches its `server.port`, datasource, JPA and
Flyway settings from this server at startup via `spring.config.import`. Shared
cross-cutting defaults (Eureka client, Kafka, JWT secret, actuator exposure) are
defined once in a shared `application.yml` document that applies to all clients.

A key design element is **profile-gated seed loading**: the six seeded services
carry a second YAML document activated only under the `docker` profile that
appends `classpath:db/seed` to their Flyway locations, so development seed data
is loaded only in the Docker environment and never against a default boot.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `config-server` |
| Package root | `com.artacademy.configserver` |
| Application class | `ConfigServerApplication` (`@SpringBootApplication`, `@EnableConfigServer`) |
| Server port | **8888** |
| Active profile | `native` |
| Backend | Native — classpath, `spring.cloud.config.server.native.search-locations: classpath:/config` |
| Spring Boot | 3.3.4 |
| Java | 21 |

---

## 3. Component Structure

The module is intentionally thin: a single annotated bootstrap class plus a
directory of served configuration documents.

```
config-server/
├── src/main/java/com/artacademy/configserver/
│   └── ConfigServerApplication.java      # @SpringBootApplication + @EnableConfigServer
└── src/main/resources/
    ├── application.yml                    # the server's own config (port 8888, native backend)
    └── config/                            # configuration SERVED to clients
        ├── application.yml                # shared defaults for ALL services
        ├── auth-service.yml               # port 8081, auth_db          (seeded)
        ├── user-service.yml               # port 8082, user_db          (seeded)
        ├── course-enrollment-service.yml  # port 8083, academic_db      (seeded)
        ├── attendance-service.yml         # port 8084, attendance_db    (seeded)
        ├── timetable-service.yml          # port 8085, timetable_db     (seeded)
        ├── payment-service.yml            # port 8086, payment_db       (seeded)
        ├── notification-service.yml       # port 8087, notification_db  (schema-only)
        └── reporting-service.yml          # port 8088, reporting_db     (schema-only)
```

`ConfigServerApplication.java`:

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

`@EnableConfigServer` activates the `/{application}/{profile}` HTTP endpoints
that serve merged property sources.

The server's own `application.yml`:

```yaml
server:
  port: 8888

spring:
  application:
    name: config-server
  profiles:
    active: native
  cloud:
    config:
      server:
        native:
          search-locations: classpath:/config

management:
  endpoints:
    web:
      exposure:
        include: health,info,refresh
```

> Note: there is **no** `api-gateway.yml` under `config/`. The API Gateway is not
> a config client of this server.

---

## 4. Served Configuration

Each per-service document defines `server.port`, `spring.application.name`, a
PostgreSQL datasource (`jdbc:postgresql://localhost:15432/<db>`, user
`artacademy` / password `artacademy123`), `jpa.hibernate.ddl-auto: validate`,
and `flyway.locations: classpath:db/migration`. Hibernate is set to `validate`
so schema authority stays with Flyway migrations, never Hibernate DDL. The
`15432` port is the Docker host-mapped port for PostgreSQL (container-internal
is `5432`).

| Service | Port | Database | Notable settings |
|---------|------|----------|------------------|
| auth-service | 8081 | `auth_db` | ddl-auto=validate; flyway `classpath:db/migration`; Kafka consumer group `auth-service-group`; **seeded** |
| user-service | 8082 | `user_db` | ddl-auto=validate; flyway `classpath:db/migration`; **seeded** |
| course-enrollment-service | 8083 | `academic_db` | ddl-auto=validate; flyway `classpath:db/migration`; **seeded** |
| attendance-service | 8084 | `attendance_db` | ddl-auto=validate; flyway `classpath:db/migration`; **seeded** |
| timetable-service | 8085 | `timetable_db` | ddl-auto=validate; flyway `classpath:db/migration`; **seeded** |
| payment-service | 8086 | `payment_db` | ddl-auto=validate; flyway `classpath:db/migration`; **seeded** |
| notification-service | 8087 | `notification_db` | ddl-auto=validate; flyway `classpath:db/migration`; SMTP mail (Gmail) config; **schema-only** |
| reporting-service | 8088 | `reporting_db` | ddl-auto=validate; flyway `classpath:db/migration`; Kafka consumer group `reporting-service-group`; **schema-only** |

Shared defaults in `config/application.yml` (merged as the base layer under
every client's own file):

- `app.jwt.secret` (base64 HS256 key), `expiration-ms` (900000 = 15 min), `refresh-expiration-ms` (604800000 = 7 days)
- Eureka client: `defaultZone: http://localhost:8761/eureka/`, `prefer-ip-address: true`
- Kafka: `bootstrap-servers: localhost:19092`, JSON (de)serializers, group `artacademy`, trusted packages `com.artacademy.*`
- Actuator exposure: `health,info,metrics`

Spring Cloud Config merges in order: `application.yml` (shared base) first, then
`{service-name}.yml` on top. So each service's `server.port` and datasource come
from its own file, while JWT, Kafka, and Eureka come from the shared file.

notification-service additionally receives mail config:

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME:noreply@artacademy.com}
    password: ${MAIL_PASSWORD:changeme}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

---

## 5. Profile-Gated Seed Loading

The six seeded services (auth, user, course-enrollment, attendance, timetable,
payment) each contain a second YAML document, separated by `---`, activated only
under the `docker` profile. That document overrides `flyway.locations` to append
`classpath:db/seed`, so dev seed migrations run **only** in the Docker
environment.

Exact snippet (from `auth-service.yml`; identical shape in the other five
seeded services):

```yaml
server:
  port: 8081

spring:
  application:
    name: auth-service
  datasource:
    url: jdbc:postgresql://localhost:15432/auth_db
    username: artacademy
    password: artacademy123
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    locations: classpath:db/migration

---
spring:
  config:
    activate:
      on-profile: docker
  flyway:
    locations: classpath:db/migration,classpath:db/seed
```

- **Default profile** → `flyway.locations: classpath:db/migration` (schema only).
- **`docker` profile** → `flyway.locations: classpath:db/migration,classpath:db/seed` (schema + seed).

`notification-service.yml` and `reporting-service.yml` are **schema-only**: they
have no `docker`-profile document, so their Flyway locations remain
`classpath:db/migration` regardless of profile.

---

## 6. How Services Consume Config

Client services do not carry local datasource/port config. They declare the
config server as an imported property source in their own `application.yml`:

```yaml
spring:
  application:
    name: auth-service        # determines which properties are fetched
  config:
    import: optional:configserver:http://localhost:8888
```

At startup the client resolves its name (`spring.application.name`), asks the
config server for `<name>` + the shared `application` defaults, and applies the
active profile (e.g. `docker`) to select the correct document set. The
`optional:` prefix lets a service still boot if the config server is
unreachable. Once configured, each service registers with Eureka at
`http://localhost:8761/eureka/` using the shared Eureka client settings served
by this server.

---

## 7. Startup Dependencies

1. **PostgreSQL** (`localhost:15432`) — required by every client service once it
   receives its datasource config; not required by the config server itself.
2. **Config Server** (`localhost:8888`) — must be up before client services so
   they can import their configuration. (Import is `optional:`, so a client can
   still boot on its bundled fallback if the server is down.)
3. **Eureka / Service Registry** (`localhost:8761`) — clients register after
   configuration; the config server registers as a Eureka client too via the
   shared defaults.
4. **Kafka** (`localhost:19092` shared default) — needed by event-driven clients
   at runtime, not by the config server.

**Recommended order: Service Registry → Config Server → Business Services.**
