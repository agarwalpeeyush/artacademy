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

| # | Document | Service | Port (local/Docker) | Database |
|---|----------|---------|---------------------|----------|
| 0 | [Common Library](common-library/DESIGN.md) | Common Library | — | — |
| 1 | [Service Registry](service-registry/DESIGN.md) | Service Registry (Eureka) | 8761 / 8761 | — |
| 2 | [Config Server](config-server/DESIGN.md) | Config Server | 8888 / 8888 | — |
| 3 | [API Gateway](api-gateway/DESIGN.md) | API Gateway | 8080 / 18080 | — |
| 4 | [Auth Service](auth-service/DESIGN.md) | Auth Service | 8081 / 8081 | `auth_db` |
| 5 | [User Service](user-service/DESIGN.md) | User Service | 8082 / 8082 | `user_db` |
| 6 | [Course Enrollment Service](course-enrollment-service/DESIGN.md) | Course Enrollment Service | 8083 / 8083 | `academic_db` |
| 7 | [Attendance Service](attendance-service/DESIGN.md) | Attendance Service | 8084 / 8084 | `attendance_db` |
| 8 | [Scheduling Service](scheduling-service/DESIGN.md) | Scheduling Service | 8085 / 8085 | `schedule_db` |
| 9 | [Payment Service](payment-service/DESIGN.md) | Payment Service | 8086 / 8086 | `payment_db` |
| 10 | [Notification Service](notification-service/DESIGN.md) | Notification Service | 8087 / 8087 | `notification_db` |
| 11 | [Reporting Service](reporting-service/DESIGN.md) | Reporting Service | 8088 / 8088 | `reporting_db` |

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

All requests enter at `http://localhost:8080` (local) or `http://localhost:18080` (Docker).

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
