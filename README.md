# Art Academy Management Platform

Enterprise-grade Art Academy and Tuition Center Management Platform built with Microservices Architecture.

## Services

| Service | Port | Database |
|---|---|---|
| service-registry | 8761 | — |
| config-server | 8888 | — |
| api-gateway | 8080 | — |
| auth-service | 8081 | auth_db |
| user-service | 8082 | user_db |
| course-enrollment-service | 8083 | academic_db |
| attendance-service | 8084 | attendance_db |
| payment-service | 8086 | payment_db |
| notification-service | 8087 | notification_db |
| reporting-service | 8088 | reporting_db |
| frontend-react | 3000 | — |

---

## Option 1 — Run Everything with Docker Compose (Recommended)

This is the fastest way to get the full stack running locally.

### Step 1 — Build all backend JARs

From the project root:

```bash
mvn clean package -DskipTests
```

This compiles all 10 Spring Boot services and places their JARs in each module's `target/` directory.

### Step 2 — Build the React frontend

```bash
cd frontend-react
npm install
npm run build
cd ..
```

### Step 3 — Start the full stack

```bash
cd docker
docker compose up -d
```

Docker Compose will start the following in dependency order:

1. PostgreSQL (creates all 7 databases automatically via `init-databases.sql`)
2. Zookeeper + Kafka
3. Redis
4. service-registry
5. config-server
6. api-gateway + all 7 microservices
7. frontend (served via Nginx)

### Step 4 — Verify services are up

```bash
docker compose ps
```

All containers should show status `healthy` or `running`.

Check the Eureka dashboard to confirm all services have registered:

```
http://localhost:8761
```

### Step 5 — Open the application

```
http://localhost:3000
```

### Stopping the stack

```bash
docker compose down
```

To also remove all data volumes (full reset):

```bash
docker compose down -v
```

---

## Option 2 — Run Services Manually (Development Mode)

Use this when you want to run individual services in your IDE or debug them directly.

### Step 1 — Start infrastructure services

Start PostgreSQL, Kafka, and Redis using Docker Compose (infrastructure only):

```bash
cd docker
docker compose up -d postgres zookeeper kafka redis
```

Wait about 30 seconds for Kafka to be ready, then verify:

```bash
docker compose ps
```

### Step 2 — Create the databases

Connect to PostgreSQL and run the init script:

```bash
docker exec -i artacademy-postgres psql -U artacademy -f /docker-entrypoint-initdb.d/init-databases.sql
```

Or connect manually and run `docker/init-databases.sql`.

### Step 3 — Start services in order

Each service reads its configuration from the config-server, so start them in this exact order. Open a separate terminal for each, or run them from your IDE.

**1. Service Registry (Eureka)**
```bash
cd service-registry
mvn spring-boot:run
```
Wait for: `Started ServiceRegistryApplication` — then open http://localhost:8761

**2. Config Server**
```bash
cd config-server
mvn spring-boot:run
```
Wait for: `Started ConfigServerApplication`

**3. API Gateway**
```bash
cd api-gateway
mvn spring-boot:run
```

**4. Auth Service**
```bash
cd auth-service
mvn spring-boot:run
```
Flyway creates the `auth_db` schema (`V1`) on first start. Demo data (`V2`) loads only under the `docker`/`dev` profile — a plain `mvn spring-boot:run` (default profile) creates schema only. To seed locally, run with `-Dspring-boot.run.profiles=docker`.

**5. Remaining services** (order does not matter from here)
```bash
cd user-service && mvn spring-boot:run
cd course-enrollment-service && mvn spring-boot:run
cd attendance-service && mvn spring-boot:run
cd payment-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
cd reporting-service && mvn spring-boot:run
```

Each service runs Flyway migrations automatically on startup to create its own schema (`V1`). Demo seed data (`V2`, under `db/seed`) is applied only when the service runs with the `docker`/`dev` profile.

### Step 4 — Start the React frontend

```bash
cd frontend-react
npm install
npm start
```

The app opens at http://localhost:3000.

The frontend proxies API calls to the gateway at http://localhost:8080 via the `REACT_APP_API_URL` variable in `.env`.

---

## Seeded Test Accounts & Sample Data

Demo data is loaded by a profile-gated Flyway migration (`V2__seed_dev_data.sql`, in each seeded
service's `db/seed` location) that runs **only under the `docker`/`dev` profile**. Docker Compose
sets `SPRING_PROFILES_ACTIVE=docker`, so containers seed automatically. A **default-profile start
(no `docker`/`dev`) creates schema only — no demo data.** Seeding is **idempotent**
(`ON CONFLICT DO NOTHING`) — restarts never duplicate rows, and any account you create later is
preserved.

The auth seed (`auth-service`) creates a **single bootstrap `admin` account** so the system is
loggable on a fresh database. Log in at http://localhost:3000 with:

| Username | Password | Email |
|---|---|---|
| `admin` | `Admin@1234` | `admin@artacademy.test` |

This bootstrap account is scoped **solely to creating the first real PRINCIPAL**: its password
cannot be changed, and once a non-bootstrap PRINCIPAL exists it auto-deactivates (`STATUS='INACTIVE'`)
and can no longer log in. Any other seeded demo accounts also use the password `Admin@1234` (emails
follow `<username>@artacademy.test`).

The known BCrypt hash used for the seeded password `Admin@1234` is
`$2a$10$tfXCZWMTBa8t03.d/TajOOYcWT9PnaRrb6ufOW4k.tjaoPV2R3qKy`.

These are demo credentials for local/testing use only.

---

## API Documentation

Swagger UI is available on each service while it is running:

| Service | Swagger URL |
|---|---|
| auth-service | http://localhost:8081/swagger-ui.html |
| user-service | http://localhost:8082/swagger-ui.html |
| course-enrollment-service | http://localhost:8083/swagger-ui.html |
| attendance-service | http://localhost:8084/swagger-ui.html |
| payment-service | http://localhost:8086/swagger-ui.html |
| notification-service | http://localhost:8087/swagger-ui.html |
| reporting-service | http://localhost:8088/swagger-ui.html |

---

## Building Individual Services

To build a single service without rebuilding the entire project:

```bash
mvn -pl auth-service -am clean package -DskipTests
```

The `-am` flag also builds `common-library` which all services depend on.

---

## Running Tests

Run all tests across all modules:

```bash
mvn test
```

Run tests for a specific service:

```bash
mvn -pl auth-service test
```

---

## Useful Docker Compose Commands

```bash
# View logs for a specific service
docker compose logs -f auth-service

# Restart a single service after rebuilding its JAR
docker compose up -d --build auth-service

# Scale a service to multiple instances
docker compose up -d --scale user-service=2

# Check resource usage
docker stats
```
---

## Environment Variables

The following variables can be overridden at runtime. Defaults work for local development.

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_USER` | `artacademy` | Database username |
| `POSTGRES_PASSWORD` | `artacademy123` | Database password |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker address |
| `REDIS_HOST` | `localhost` | Redis host |
| `EUREKA_URL` | `http://localhost:8761/eureka/` | Eureka service URL |
| `APP_JWT_SECRET` | *(see config)* | JWT signing key (min 256-bit) |
| `MAIL_USERNAME` | `noreply@artacademy.com` | SMTP username |
| `MAIL_PASSWORD` | `changeme` | SMTP password |

---

## Troubleshooting

**Services fail to start with "Connection refused" to config-server**
Config-server must be running before any application service. Ensure service-registry starts first, then config-server.

**Flyway migration errors on startup**
The database must exist before the service starts. Run `docker/init-databases.sql` to create all databases, or use `docker compose up -d postgres` and let the init script run automatically.

**Kafka consumer not receiving events**
Verify Kafka is healthy: `docker compose logs kafka`. Check that `KAFKA_BOOTSTRAP_SERVERS` points to the correct address. Inside Docker Compose, services use `kafka:9092`; outside Docker, use `localhost:9092`.

**Frontend shows blank page or 401 errors**
Ensure the api-gateway is running on port 8080. Check the browser console for CORS errors. Verify the JWT token is not expired (tokens last 15 minutes by default; the frontend refreshes automatically).

**Port already in use**
Stop any conflicting processes or change service ports in `config-server/src/main/resources/config/<service-name>.yml`.

---

## Infrastructure Services

The following services are infrastructure — they support the application but contain no business logic:

| Service | Purpose |
|---|---|
| `postgres` | Database |
| `redis` | Cache |
| `zookeeper` | Kafka coordinator |
| `kafka` | Message broker |
| `elasticsearch` | Log storage |
| `logstash` | Log pipeline |
| `kibana` | Log viewer |
| `service-registry` | Eureka — service discovery |
| `config-server` | Centralised configuration |

### Start infrastructure services only

Run from the `docker/` directory:

Clean start (wipes all Postgres data, re-runs init + seed scripts):

```bash
cd docker
docker compose down postgres
docker volume rm docker_postgres-data
docker compose up -d postgres
```

Full clean start from fresh volumes:
  docker compose -f docker/docker-compose.yml down -v --remove-orphans
  docker compose -f docker/docker-compose.yml up -d
```

```bash
docker compose up -d postgres redis zookeeper kafka elasticsearch logstash kibana
```
Useful when starting business services selectively, or running them locally from an IDE during development without starting the full stack.

```bash
mvn clean package -DskipTests

docker compose up -d service-registry config-server api-gateway auth-service
```

```bash
docker compose up -d --no-deps user-service course-enrollment-service attendance-service payment-service notification-service reporting-service
```

```bash
Clean-start command (run from the docker/ directory):

docker compose down -v --remove-orphans && docker compose up -d postgres redis zookeeper kafka elasticsearch logstash kibana

- down -v stops/removes containers, the network, and all named volumes (postgres-data, kafka-data, redis-data, elasticsearch-data) — this is what guarantees Kafka and Zookeeper
  reset together, so no cluster-ID mismatch.
- --remove-orphans clears any leftover containers not in the current compose scope.
- Then brings up only the 7 infra services fresh (Postgres re-runs its init + seed scripts on the empty volume).

If you'd rather keep Postgres data but still reset Kafka/ZK cleanly (the mismatch only involves Kafka + Zookeeper):

docker compose down --remove-orphans && docker volume rm docker_kafka-data && docker compose up -d postgres redis zookeeper kafka elasticsearch logstash kibana
```
```bash
clean local deploy (CRA) of frontend-react app

# 1. Remove stale deps, build output, and CRA cache
rm -rf node_modules build node_modules/.cache

# 2. Fresh, reproducible install (uses package-lock.json exactly)
npm ci

# 3a. Dev server with hot-reload (http://localhost:3000)
npm start
```
