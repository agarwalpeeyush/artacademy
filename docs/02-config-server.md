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
├── application.yml                  # Config Server's own bootstrap
└── config/
    └── application.yml              # Shared properties served to ALL services
```

The `spring.cloud.config.server.native.searchLocations` property points at `classpath:/config/` so the server uses the bundled files (native profile). In production this would point at a Git repository.

---

## 5. Properties Served

The shared `config/application.yml` provides (at minimum) the following to all clients:

### Database
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/{db_name}
    username: postgres
    password: ...
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true
```

Each service has its own database name (see per-service design docs).

### JWT
```yaml
jwt:
  secret: YXJ0YWNhZGVteS1zdXBlci1zZWNyZXQtand0...  # base64 encoded
  expiration: 86400000   # 24 h in ms
```

### Kafka
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      group-id: artacademy-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
```

### Mail (used by notification-service)
```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ...
    password: ...
```

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
