# API Gateway — Detail Design Document

## 1. Overview

The **API Gateway** is the single public entry point for the Art Academy platform. It is built on **Spring Cloud Gateway** (reactive, Netty-based) running on **Spring Boot 3.3.4 / Java 21**. It performs:

- **Path-based routing** to backend microservices, resolving instances through **Eureka** service discovery via `lb://` URIs.
- **JWT validation** on all protected routes through a custom `JwtAuth` gateway filter, forwarding the authenticated identity and roles to downstream services as request headers.
- **Global CORS** handling for all paths.
- **Redis-backed request rate limiting** applied globally as a default filter, keyed by client IP.

Fine-grained authorization (role checks per endpoint) is delegated to each downstream service; the gateway only proves that a valid token is present and propagates the caller identity.

## 2. Module Coordinates

| Property | Value |
| --- | --- |
| ArtifactId | `api-gateway` (parent `artacademy-platform` `1.0.0-SNAPSHOT`) |
| Package root | `com.artacademy.gateway` |
| Server port (local) | `8080` |
| Server port (Docker) | container `8080`, host-mapped to `18080` (`18080:8080`) |
| Config source | Local `src/main/resources/application.yml` (routes defined here). `spring.config.import=optional:configserver:http://localhost:8888` is present but optional; no `api-gateway.yml` exists in config-server. |
| Key dependencies | `spring-cloud-starter-gateway`, `spring-cloud-starter-netflix-eureka-client`, `spring-cloud-starter-config`, `spring-boot-starter-data-redis-reactive`, `jjwt-api/impl/jackson`, `spring-boot-starter-actuator`, `lombok` |

## 3. Component Structure

Actual source tree:

```
api-gateway/
├── pom.xml
└── src/main/
    ├── java/com/artacademy/gateway/
    │   ├── ApiGatewayApplication.java          # @SpringBootApplication; defines ipKeyResolver KeyResolver bean
    │   └── filter/
    │       └── JwtAuthGatewayFilterFactory.java # "JwtAuth" GatewayFilterFactory — validates Bearer JWT, injects identity headers
    └── resources/
        └── application.yml                      # routes, CORS, rate limiter, Eureka, JWT secret, actuator
```

There are only two Java classes — the application bootstrap (which also declares the rate-limiter `KeyResolver` bean) and the JWT filter factory. All routing/CORS/rate-limit configuration is declarative in `application.yml`.

## 4. Routing Table

All routes are defined in `application.yml` under `spring.cloud.gateway.routes`. Every downstream URI is a load-balanced Eureka reference (`lb://<service-id>`). The `RequestRateLimiter` default filter and global CORS apply to **every** route; the `JwtAuth` filter is applied only to routes that list it.

| Route id | Method | Path predicate | Downstream URI | Route filters |
| --- | --- | --- | --- | --- |
| `auth-service` | ANY | `/auth/**` | `lb://auth-service` | none (public — auth-service issues/validates its own tokens) |
| `user-service` | ANY | `/teachers/**`, `/students/**`, `/parents/**`, `/users/**` | `lb://user-service` | `JwtAuth` |
| `course-enrollment-service` | ANY | `/courses/**`, `/classes/**`, `/enrollments/**` | `lb://course-enrollment-service` | `JwtAuth` |
| `attendance-service` | ANY | `/attendance/**` | `lb://attendance-service` | `JwtAuth` |
| `timetable-service` | ANY | `/timetables/**`, `/rooms/**` | `lb://timetable-service` | `JwtAuth` |
| `payment-service` | ANY | `/fees/**`, `/payments/**` | `lb://payment-service` | `JwtAuth` |
| `notification-service` | ANY | `/notifications/**` | `lb://notification-service` | `JwtAuth` |
| `reporting-service` | ANY | `/reports/**` | `lb://reporting-service` | `JwtAuth` |

There is no `scheduling-service` route; the schedule domain is served by `timetable-service` (`/timetables/**`, `/rooms/**`).

## 5. Cross-Cutting Filters

### 5.1 Global CORS

Configured under `spring.cloud.gateway.globalcors.corsConfigurations['[/**]']`:

```yaml
globalcors:
  corsConfigurations:
    '[/**]':
      allowedOrigins: "*"
      allowedMethods: "*"
      allowedHeaders: "*"
```

Applies to all paths. Preflight `OPTIONS` requests are answered by the gateway with the corresponding `Access-Control-Allow-*` headers before routing. In production, `allowedOrigins` should be narrowed to the frontend domain.

### 5.2 JWT Validation Flow (`JwtAuth` filter)

Implemented by `JwtAuthGatewayFilterFactory` (bean name `JwtAuth`, a `@Component` extending `AbstractGatewayFilterFactory`). Per request:

1. Read the `Authorization` header. If missing or not prefixed with `Bearer `, respond **`401 Unauthorized`** and complete the exchange (no downstream call).
2. Strip the `Bearer ` prefix and verify the token signature using an HMAC-SHA key derived from the Base64-decoded `app.jwt.secret`.
3. On success, extract claims and **mutate the request** to add:
   - `X-Auth-User` — the token subject (`sub`).
   - `X-Auth-Roles` — comma-joined `roles` claim.
4. On any `JwtException` (bad signature, expired, malformed), log a warning and respond **`401 Unauthorized`**.

```java
Claims claims = Jwts.parser().verifyWith(key).build()
        .parseSignedClaims(token).getPayload();
exchange.getRequest().mutate()
        .header("X-Auth-User", claims.getSubject())
        .header("X-Auth-Roles", String.join(",", (Iterable<String>) claims.get("roles", List.class)))
        .build();
```

The signing secret is shared platform-wide (`app.jwt.secret`, the same Base64 value used by `auth-service` to sign tokens). The gateway is stateless — no session is stored.

### 5.3 Rate Limiter

Applied globally via `spring.cloud.gateway.default-filters` as a `RequestRateLimiter` backed by reactive Redis:

```yaml
default-filters:
  - name: RequestRateLimiter
    args:
      redis-rate-limiter.replenishRate: 100
      redis-rate-limiter.burstCapacity: 200
      redis-rate-limiter.requestedTokens: 1
```

| Parameter | Value | Meaning |
| --- | --- | --- |
| `replenishRate` | 100 | tokens refilled per second |
| `burstCapacity` | 200 | maximum burst size |
| `requestedTokens` | 1 | tokens consumed per request |

**Key resolver:** an `ipKeyResolver` `KeyResolver` bean in `ApiGatewayApplication` keys the limiter by the client's remote IP address (falling back to `"anonymous"` when the remote address is unavailable). When capacity is exceeded the gateway returns **`429 Too Many Requests`**. Requires a reachable Redis instance (dependency `spring-boot-starter-data-redis-reactive`).

## 6. Security Model

| Path prefix | Access |
| --- | --- |
| `/auth/**` | **Public** — no gateway JWT filter; auth-service handles login/refresh and issues tokens |
| `/teachers`, `/students`, `/parents`, `/users` | Authenticated (valid Bearer JWT) |
| `/courses`, `/classes`, `/enrollments` | Authenticated |
| `/attendance` | Authenticated |
| `/timetables`, `/rooms` | Authenticated |
| `/fees`, `/payments` | Authenticated |
| `/notifications` | Authenticated |
| `/reports` | Authenticated |

- The gateway enforces **authentication only** — token present and signature valid.
- **Authorization / role enforcement is fine-grained and performed inside each downstream service**, using the `X-Auth-User` and `X-Auth-Roles` headers injected by the gateway.
- Downstream services trust these headers because they are reachable only inside the Docker `artacademy-network`; they should not be exposed publicly.

## 7. Configuration

- **Routes, CORS, rate limiter, Eureka, JWT secret, actuator exposure** are all defined in `api-gateway/src/main/resources/application.yml`.
- `spring.config.import: optional:configserver:http://localhost:8888` allows optional overrides from the config-server, but there is currently **no `api-gateway.yml` in the config-server**, so effective config is the local file. In Docker, `SPRING_CLOUD_CONFIG_URI=http://config-server:8888` is set for the same optional import.
- **Eureka discovery:**

  ```yaml
  eureka:
    client:
      service-url:
        defaultZone: http://localhost:8761/eureka/   # docker: http://service-registry:8761/eureka/
    instance:
      prefer-ip-address: true
  ```

- **Actuator:** `management.endpoints.web.exposure.include: health,info,gateway` — exposes `/actuator/gateway` for route introspection.

## 8. Startup Dependencies

| Dependency | Why | Effect if missing |
| --- | --- | --- |
| **service-registry (Eureka, :8761)** | Resolves all `lb://` route targets | Routes cannot resolve downstream instances → `503`/routing errors |
| **Redis** | Backing store for `RequestRateLimiter` | Rate-limited requests fail; gateway cannot enforce limits |
| **config-server (:8888)** | Optional config import (`optional:`) | None currently — import is optional and no gateway config file is served |
| Downstream services | Registered in Eureka to receive traffic | Individual routes return `503` until their target registers |

Docker `depends_on` for `api-gateway`: `service-registry`, `config-server`, `redis`.
