# Art Academy Management Platform

Enterprise-grade Art Academy and Tuition Center Management Platform built with Microservices Architecture.

## Documentation

- **[DESIGN.md](DESIGN.md)** — Platform overview, service inventory, data model, Kafka event flow, route & role summary
- **[PRD.md](PRD.md)** — Product requirements: functional features by role and domain
- **[TESTING.md](TESTING.md)** — UI test scenarios per role and feature (uses the seeded accounts below)
- **[TODO.md](TODO.md)** — Remaining backlog
- Each service folder also contains its own `DESIGN.md` (e.g. `auth-service/DESIGN.md`, `payment-service/DESIGN.md`)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Cloud 2023.0 |
| Database | PostgreSQL 16 |
| Messaging | Apache Kafka 7.6 |
| Caching | Redis 7 |
| Frontend | React 18, TypeScript, Material UI v5, Redux Toolkit |
| Gateway | Spring Cloud Gateway |
| Registry | Netflix Eureka |
| Config | Spring Cloud Config Server |
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes, Helm |

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
| scheduling-service | 8085 | schedule_db |
| payment-service | 8086 | payment_db |
| notification-service | 8087 | notification_db |
| reporting-service | 8088 | reporting_db |
| frontend-react | 3000 | — |

---

## Prerequisites

Install the following before proceeding:

- [Java 21](https://adoptium.net/) (Eclipse Temurin recommended)
- [Maven 3.9+](https://maven.apache.org/download.cgi)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Git](https://git-scm.com/)

Verify versions:

```bash
java -version
mvn -version
node -version
npm -version
docker -version
docker compose version
```

---

## Option 1 — Run Everything with Docker Compose (Recommended)

This is the fastest way to get the full stack running locally.

### Step 1 — Build all backend JARs

From the project root:

```bash
mvn clean package -DskipTests
```

This compiles all 11 Spring Boot services and places their JARs in each module's `target/` directory.

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

1. PostgreSQL (creates all 8 databases automatically via `init-databases.sql`)
2. Zookeeper + Kafka
3. Redis
4. service-registry
5. config-server
6. api-gateway + all 8 microservices
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
Flyway will automatically create and seed the `auth_db` schema on first start.

**5. Remaining services** (order does not matter from here)
```bash
cd user-service && mvn spring-boot:run
cd course-enrollment-service && mvn spring-boot:run
cd attendance-service && mvn spring-boot:run
cd scheduling-service && mvn spring-boot:run
cd payment-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
cd reporting-service && mvn spring-boot:run
```

Each service runs Flyway migrations automatically on startup to create its own schema.

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

On first start, Flyway seeds each database with roles **and** a ready-to-use set of sample
data so the whole application can be exercised end to end without any manual SQL. Seeding is
**idempotent** (`ON CONFLICT DO NOTHING`) — restarts never duplicate rows, and any account you
create later is preserved.

**All seeded accounts share the password `Admin@1234`.** Log in at http://localhost:3000.

| Username | Role | Notes |
|----------|------|-------|
| `principal` | PRINCIPAL | Full administrative access |
| `teacher1` | TEACHER | Teaches *Painting A* (Mon/Wed 09:00–11:00, Studio 1) |
| `teacher2` | TEACHER | Teaches *Sculpture A* (Tue/Thu 15:00–17:00, Studio 2) |
| `student1` | STUDENT | Enrolled in Painting **and** Sculpture; fees fully PAID |
| `student2` | STUDENT | Enrolled in Painting; fees UNPAID (appears in defaulters) |
| `student3` | STUDENT | Enrolled in Sculpture |
| `parent1` | PARENT | Linked to `student1` |

The seed also creates: 2 courses, 2 classes, 4 enrollments, 2 rooms, 4 published weekly
schedules, recent student/teacher attendance rows, and an August 2026 fee cycle (one PAID, one
UNPAID) with a matching payment and receipt.

> **Security note:** these are demo credentials for local/testing use only. Change or remove the
> seed migrations before any non-development deployment.

The known BCrypt hash used for the seeded password `Admin@1234` is
`$2a$10$N.wWIFnMHSbLxuOUJZBnkuoUqLpAHgJhHpNVU2jMqzO1X1Vu1QBWO`.

---

## API Documentation

Swagger UI is available on each service while it is running:

| Service | Swagger URL |
|---|---|
| auth-service | http://localhost:8081/swagger-ui.html |
| user-service | http://localhost:8082/swagger-ui.html |
| course-enrollment-service | http://localhost:8083/swagger-ui.html |
| attendance-service | http://localhost:8084/swagger-ui.html |
| scheduling-service | http://localhost:8085/swagger-ui.html |
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

## Option 3 — Kubernetes (Local with minikube)

### Prerequisites

- [minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm 3](https://helm.sh/docs/intro/install/)

### Step 1 — Start minikube

```bash
minikube start --memory=8192 --cpus=4
eval $(minikube docker-env)
```

### Step 2 — Build Docker images inside minikube

```bash
mvn clean package -DskipTests

docker build -f docker/Dockerfile.springboot \
  --build-arg SERVICE_NAME=auth-service \
  --build-arg SERVICE_PORT=8081 \
  -t artacademy/auth-service:latest .

# Repeat for each service, changing SERVICE_NAME and SERVICE_PORT
```

### Step 3 — Deploy with kubectl

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/kafka.yaml
kubectl apply -f kubernetes/redis.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n artacademy --timeout=120s

kubectl apply -f kubernetes/service-registry.yaml
kubectl apply -f kubernetes/config-server.yaml
kubectl apply -f kubernetes/api-gateway.yaml
kubectl apply -f kubernetes/auth-service.yaml
kubectl apply -f kubernetes/services.yaml
kubectl apply -f kubernetes/frontend.yaml
kubectl apply -f kubernetes/ingress.yaml
```

### Step 4 — Access the application

```bash
minikube tunnel
```

Then open http://app.artacademy.local (add to your `/etc/hosts` if needed).

### Deploy with Helm

```bash
helm install artacademy ./helm \
  --namespace artacademy \
  --create-namespace \
  --set image.tag=latest
```

Upgrade after changes:

```bash
helm upgrade artacademy ./helm --set image.tag=latest
```

Uninstall:

```bash
helm uninstall artacademy -n artacademy
```

---

## CI/CD Pipeline

The `.github/workflows/ci.yml` pipeline runs on pushes and pull requests to `main` and `develop`.

| Job | Trigger | What it does |
|---|---|---|
| `build` | All pushes & PRs | Compiles all Maven modules, runs tests against a PostgreSQL service container |
| `build-frontend` | All pushes & PRs | `npm ci`, lint, unit tests, production build |
| `docker-build` | Push only (after both build jobs pass) | Builds and pushes multi-arch (`amd64`/`arm64`) images to Docker Hub for all 12 services |
| `deploy` | Push to `main` only | Applies Kubernetes manifests and rolls out new image tags |

**Required GitHub secrets for Docker push and deploy:**

| Secret | Description |
|---|---|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `KUBECONFIG` | Base64-encoded kubeconfig for the target cluster |

---

## Project Structure

```
artacademy/
├── pom.xml                          Root multi-module Maven POM
├── common-library/                  Shared: JWT, exceptions, Kafka events, DTOs
├── service-registry/                Eureka Service Registry
├── config-server/                   Spring Cloud Config Server
│   └── src/main/resources/config/   Per-service configuration YAMLs
├── api-gateway/                     Spring Cloud Gateway (JWT filter, routing)
├── auth-service/                    Authentication, JWT, roles
├── user-service/                    Teachers, students, availability
├── course-enrollment-service/       Courses, classes, enrollments
├── attendance-service/              Teacher & student attendance
├── scheduling-service/              Timetable, rooms, conflict validation
├── payment-service/                 Fee cycles, payments, allocations
├── notification-service/            Email/SMS, Kafka event consumer
├── reporting-service/               Materialized summaries, analytics
├── frontend-react/                  React + TypeScript + MUI + RTK
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.springboot
│   └── init-databases.sql
├── kubernetes/                      K8s manifests
├── helm/                            Helm chart
└── .github/workflows/ci.yml         CI/CD pipeline
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

```bash
docker compose up -d postgres redis zookeeper kafka elasticsearch logstash kibana service-registry config-server
```

Useful when starting business services selectively, or running them locally from an IDE during development without starting the full stack.
