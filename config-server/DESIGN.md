# Config Server — Detail Design Document

## 1. Overview

The `config-server` is a Spring Cloud Config Server that externalises all environment-specific properties for every microservice into a single, central location. Services import their configuration at startup from this server, keeping `application.yml` files inside the service JARs minimal.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `config-server` |
| Package root | `com.artacademy.configserver` |
| Server port | **8888** |

---

## 3. Application Class

```
ConfigServerApplication.java
  @SpringBootApplication
  @EnableConfigServer
```

`@EnableConfigServer` activates the `/[application]/[profile]` HTTP endpoints that serve property sources.

---

## 4. Configuration Layout

```
config-server/src/main/resources/
├── application.yml                          # Config Server's own bootstrap
└── config/
    ├── application.yml                      # Shared properties served to ALL services
    ├── auth-service.yml                     # auth-service specific overrides
    ├── user-service.yml                     # user-service specific overrides
    ├── course-enrollment-service.yml        # course-enrollment-service specific overrides
    ├── attendance-service.yml               # attendance-service specific overrides
    ├── scheduling-service.yml               # scheduling-service specific overrides
    ├── payment-service.yml                  # payment-service specific overrides
    ├── notification-service.yml             # notification-service specific overrides
    └── reporting-service.yml                # reporting-service specific overrides
```

The `spring.cloud.config.server.native.searchLocations` property points at `classpath:/config/` so the server uses the bundled files (native profile). In production this would point at a Git repository.

Spring Cloud Config merges properties in order: `application.yml` (shared base) is loaded first, then `{service-name}.yml` (per-service overrides) is applied on top. This means each service's `server.port` and `datasource.url` come from its own file, while JWT, Kafka, and Eureka config come from the shared file.

---

## 5. Properties Served

### 5.1 Shared — `config/application.yml`

Served to every service as the base layer.

#### JWT
```yaml
app:
  jwt:
    secret: YXJ0YWNhZGVteS1zdXBlci1zZWNyZXQtand0...  # base64 encoded HS256 key
    expiration-ms: 900000        # 15 minutes
    refresh-expiration-ms: 604800000  # 7 days
```

#### Kafka
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:19092   # Docker host-mapped port
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      group-id: artacademy
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.artacademy.*"
```

#### Eureka Client
```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true
```

### 5.2 Per-Service — `config/{service-name}.yml`

Each service has its own file that sets `server.port` and `datasource.url`. PostgreSQL is accessed via `localhost:15432` (Docker host-mapped port; container-internal is `5432`).

| Service | `server.port` | `datasource.url` (local/dev) |
|---------|---------------|-------------------------------|
| auth-service | 8081 | `jdbc:postgresql://localhost:15432/auth_db` |
| user-service | 8082 | `jdbc:postgresql://localhost:15432/user_db` |
| course-enrollment-service | 8083 | `jdbc:postgresql://localhost:15432/academic_db` |
| attendance-service | 8084 | `jdbc:postgresql://localhost:15432/attendance_db` |
| scheduling-service | 8085 | `jdbc:postgresql://localhost:15432/schedule_db` |
| payment-service | 8086 | `jdbc:postgresql://localhost:15432/payment_db` |
| notification-service | 8087 | `jdbc:postgresql://localhost:15432/notification_db` |
| reporting-service | 8088 | `jdbc:postgresql://localhost:15432/reporting_db` |

All per-service files also set:
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    locations: classpath:db/migration
```

#### Mail (notification-service only — in `notification-service.yml`)
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

### 5.3 Docker Override

When running in Docker Compose, the following environment variables override Config Server values at the service level:

| Env var | Value | Overrides |
|---------|-------|-----------|
| `SERVER_PORT` | e.g. `8081` | `server.port` |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/auth_db` | `spring.datasource.url` |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | `spring.kafka.bootstrap-servers` |
| `EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE` | `http://service-registry:8761/eureka/` | eureka defaultZone |
| `SPRING_CLOUD_CONFIG_URI` | `http://config-server:8888` | config server URL |

Note that inside Docker the PostgreSQL host is `postgres:5432` (container name + internal port) and Kafka is `kafka:9092` — the `localhost:15432` / `localhost:19092` values in the Config Server files are for running services directly on the host machine outside Docker.

---

## 6. Client Configuration Pattern

Every business service bootstrap:

```yaml
# src/main/resources/application.yml  (inside the service JAR)
spring:
  application:
    name: auth-service        # determines which properties are fetched
  config:
    import: optional:configserver:http://localhost:8888
```

`optional:` prefix means the service still starts if the Config Server is unreachable (using defaults).

---

## 7. Dependencies

```xml
<dependency>spring-cloud-config-server</dependency>
<dependency>spring-boot-starter-actuator</dependency>
```

---

## 8. Startup Order

Config Server must start after Service Registry (to register itself) but before any business service that imports configuration from it.

**Order: Service Registry → Config Server → Business Services**
