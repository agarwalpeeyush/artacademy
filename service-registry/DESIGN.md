# Service Registry — Detail Design Document

## 1. Overview

The `service-registry` module is a Netflix Eureka Server. It is the central location where all microservices register themselves on startup, and where other services (including the API Gateway) look up the network location of their peers. No business logic lives here.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `service-registry` |
| Package root | `com.artacademy.serviceregistry` |
| Server port | **8761** |

---

## 3. Application Class

```
ServiceRegistryApplication.java
  @SpringBootApplication
  @EnableEurekaServer
```

`@EnableEurekaServer` activates the Eureka server endpoints (`/eureka/*`, `/`) served by Spring Cloud Netflix.

---

## 4. Configuration

```yaml
server:
  port: 8761

eureka:
  instance:
    hostname: localhost
  client:
    registerWithEureka: false   # does not register with itself
    fetchRegistry: false        # does not fetch its own registry
    serviceUrl:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
```

`registerWithEureka: false` and `fetchRegistry: false` are standard settings that prevent the server from attempting to register or discover itself.

---

## 5. Service Registration Pattern

Every business service configures:

```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: http://localhost:8761/eureka/
  instance:
    preferIpAddress: true
```

On startup the service sends a `POST /eureka/apps/{appName}` registration. Heartbeats renew every 30 s by default. If no heartbeat is received within 90 s, Eureka evicts the instance.

---

## 6. Registered Services

| Eureka App Name | Local/Dev Port | Docker Container Port | Docker Host Port |
|-----------------|---------------|-----------------------|-----------------|
| `API-GATEWAY` | 8080 | 8080 | 18080 |
| `AUTH-SERVICE` | 8081 | 8081 | 8081 |
| `USER-SERVICE` | 8082 | 8082 | 8082 |
| `COURSE-ENROLLMENT-SERVICE` | 8083 | 8083 | 8083 |
| `ATTENDANCE-SERVICE` | 8084 | 8084 | 8084 |
| `SCHEDULING-SERVICE` | 8085 | 8085 | 8085 |
| `PAYMENT-SERVICE` | 8086 | 8086 | 8086 |
| `NOTIFICATION-SERVICE` | 8087 | 8087 | 8087 |
| `REPORTING-SERVICE` | 8088 | 8088 | 8088 |

---

## 7. Dependencies

```xml
<dependency>spring-cloud-starter-netflix-eureka-server</dependency>
<dependency>spring-boot-starter-actuator</dependency>
```

---

## 8. Actuator Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Liveness probe for orchestrators |
| `/actuator/info` | Build metadata |

---

## 9. Startup Order Dependency

The Service Registry must start **before** any other service. In Docker Compose / Kubernetes, all other services declare `depends_on: service-registry` or use an init-container readiness check against `http://service-registry:8761/actuator/health`.
