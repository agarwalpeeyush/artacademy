# Config Server — Testing Guide

The Config Server exposes Spring Cloud Config's `/{application}/{profile}`
endpoints on port **8888**. Testing is primarily black-box: hit those endpoints
and assert the merged property sources match the files under
`src/main/resources/config/`, then confirm a real client boots and picks up its
settings.

## Prerequisites

- Config Server running on `http://localhost:8888` (profile `native`).
- `curl` (examples use JSON responses; pipe through `jq` to pretty-print).

## Scenario Table

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Default view of a service | `GET http://localhost:8888/auth-service/default` | 200 JSON. `propertySources` include `config/auth-service.yml` and shared `config/application.yml`. `server.port=8081`, datasource `jdbc:postgresql://localhost:15432/auth_db`, `flyway.locations=classpath:db/migration`. |
| 2 | Docker view of a **seeded** service | `GET http://localhost:8888/auth-service/docker` | 200 JSON. The docker-profile document is included; `flyway.locations` resolves to `classpath:db/migration,classpath:db/seed` (seed appended). Port and datasource unchanged. |
| 3 | Docker view of a **schema-only** service | `GET http://localhost:8888/reporting-service/docker` | 200 JSON. No seed document exists; `flyway.locations` remains `classpath:db/migration` only. `server.port=8088`, datasource `reporting_db`. |
| 4 | Default view of schema-only service | `GET http://localhost:8888/notification-service/default` | 200 JSON. `flyway.locations=classpath:db/migration`; mail config present (`spring.mail.host=smtp.gmail.com`, port 587). No `db/seed`. |
| 5 | Shared defaults merged in | `GET http://localhost:8888/user-service/default` | Response contains shared `application.yml` values: Eureka `defaultZone=http://localhost:8761/eureka/`, Kafka `bootstrap-servers=localhost:19092`, `app.jwt.secret`, expirations. |
| 6 | All eight services resolvable | `GET /{svc}/default` for auth(8081), user(8082), course-enrollment(8083/academic_db), attendance(8084), timetable(8085), payment(8086), notification(8087), reporting(8088) | Each returns 200 with the correct port and database. |
| 7 | Unknown / non-served application | `GET http://localhost:8888/api-gateway/default` | 200 with only the shared `application.yml` layer (no `api-gateway.yml` exists in `config/`). |
| 8 | Client boots and picks up config | Start auth-service with `spring.config.import=optional:configserver:http://localhost:8888` | Service starts on port 8081 with the served datasource; visible in Eureka. |
| 9 | Client boots when server is down | Stop Config Server, start a client | Client still starts (import is `optional:`), using bundled fallback. |
| 10 | Server health | `GET http://localhost:8888/actuator/health` | 200 `{"status":"UP"}`. |

## Example Commands

Fetch the docker-profile view for a seeded service (expect `db/seed` appended):

```bash
curl http://localhost:8888/auth-service/docker
```

Fetch the default view (schema only, no seed):

```bash
curl http://localhost:8888/auth-service/default
```

Confirm a schema-only service never gets seed data even under docker:

```bash
curl http://localhost:8888/reporting-service/docker
# flyway.locations => classpath:db/migration   (no db/seed)
```

Pretty-print and pull out just Flyway locations with jq:

```bash
curl -s http://localhost:8888/timetable-service/docker \
  | jq '.propertySources[].source["spring.flyway.locations"] // empty'
# => "classpath:db/migration,classpath:db/seed"
```

Check server health:

```bash
curl http://localhost:8888/actuator/health
```

## Notes

- Endpoint form is `/{application}/{profile}`; `{application}` is the client's
  `spring.application.name`, `{profile}` is `default` or `docker`.
- The `docker` profile only changes `flyway.locations` for the six seeded
  services; ports, datasources, and shared defaults are identical across
  profiles.
- Seeded services: auth, user, course-enrollment, attendance, timetable,
  payment. Schema-only: notification, reporting.
