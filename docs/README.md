# Art Academy Platform — Design Document Index

## Platform Overview

The Art Academy Platform is a microservices-based educational management system built with **Spring Boot 3.3.4** and **Spring Cloud 2023.0.3**. It manages courses, teachers, students, attendance, payments, scheduling, and reporting for an art academy.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.3.4 |
| Service Mesh | Spring Cloud 2023.0.3 (Eureka + Config Server + Gateway) |
| Database | PostgreSQL (separate DB per service) |
| Migration | Flyway |
| Messaging | Apache Kafka |
| Security | JWT (JJWT 0.12.6) + Spring Security |
| ORM | Spring Data JPA / Hibernate |
| Mapping | MapStruct 1.5.5.Final |
| Frontend | React 18 + TypeScript + MUI + Redux Toolkit |
| API Docs | SpringDoc OpenAPI 2.6.0 |

---

## Service Inventory

| # | Document | Service | Port | Database |
|---|----------|---------|------|----------|
| 0 | [00-common-library.md](00-common-library.md) | Common Library | — | — |
| 1 | [01-service-registry.md](01-service-registry.md) | Service Registry (Eureka) | 8761 | — |
| 2 | [02-config-server.md](02-config-server.md) | Config Server | 8888 | — |
| 3 | [03-api-gateway.md](03-api-gateway.md) | API Gateway | 8080 | — |
| 4 | [04-auth-service.md](04-auth-service.md) | Auth Service | 8081 | artacademy_auth |
| 5 | [05-user-service.md](05-user-service.md) | User Service | 8082 | artacademy_users |
| 6 | [06-course-enrollment-service.md](06-course-enrollment-service.md) | Course Enrollment Service | 8083 | artacademy_courses |
| 7 | [07-attendance-service.md](07-attendance-service.md) | Attendance Service | 8084 | artacademy_attendance |
| 8 | [08-scheduling-service.md](08-scheduling-service.md) | Scheduling Service | 8085 | artacademy_scheduling |
| 9 | [09-payment-service.md](09-payment-service.md) | Payment Service | 8086 | artacademy_payments |
| 10 | [10-notification-service.md](10-notification-service.md) | Notification Service | 8087 | artacademy_notifications |
| 11 | [11-reporting-service.md](11-reporting-service.md) | Reporting Service | 8088 | artacademy_reporting |

---

## Startup Order

```
1. service-registry    (port 8761)   — Eureka server
2. config-server       (port 8888)   — must register with Eureka first
3. api-gateway         (port 8080)   — imports config, discovers services
4. auth-service        (port 8081)   — imports config
5. user-service        (port 8082)   — imports config
6. course-enrollment-service (8083)  — imports config
7. attendance-service  (port 8084)   — imports config
8. scheduling-service  (port 8085)   — imports config
9. payment-service     (port 8086)   — imports config, needs Kafka
10. notification-service (port 8087) — imports config, needs Kafka + SMTP
11. reporting-service  (port 8088)   — imports config, needs Kafka
```

---

## Kafka Event Flow

```
user-service ──► student.created, teacher.created
                   └──► reporting-service

course-enrollment-service ──► enrollment.created, enrollment.cancelled
                   ├──► payment-service (EnrollmentCache)
                   └──► reporting-service

attendance-service ──► attendance.recorded
                   ├──► reporting-service
                   └──► notification-service (absent alert)

scheduling-service ──► schedule.generated, schedule.updated
                   └──► (future consumers)

payment-service ──► fee.generated
                   ├──► reporting-service
                   └──► notification-service (fee reminder)
              ──► payment.received
                   ├──► reporting-service
                   └──► notification-service (receipt)
              ──► fee.status.updated
                   └──► reporting-service

Any service ──► notification.request
                   └──► notification-service
```

---

## API Gateway Route Summary

All requests enter at `http://localhost:8080`.

| Path prefix | Downstream service | JWT required |
|-------------|-------------------|--------------|
| `/auth/**` | auth-service | No |
| `/students/**` | user-service | Yes |
| `/teachers/**` | user-service | Yes |
| `/courses/**` | course-enrollment-service | Yes |
| `/classes/**` | course-enrollment-service | Yes |
| `/enrollments/**` | course-enrollment-service | Yes |
| `/attendance/**` | attendance-service | Yes |
| `/schedules/**` | scheduling-service | Yes |
| `/fees/**` | payment-service | Yes |
| `/payments/**` | payment-service | Yes |
| `/notifications/**` | notification-service | Yes |
| `/reports/**` | reporting-service | Yes |

---

## Role-Based Access Summary

| Role | Access |
|------|--------|
| `PRINCIPAL` | Full access to all endpoints |
| `TEACHER` | Mark/view attendance; view assigned students; view schedules |
| `STUDENT` | View own profile, enrollments, schedule, attendance, fees |
