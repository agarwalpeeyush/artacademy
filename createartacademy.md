# SKILL.md

# Skill Name

Art Academy Management Platform

# Purpose

Build a scalable, enterprise-grade Art Academy and Tuition Center Management Platform using Microservices Architecture.

The platform manages:

- Art & Drawing Classes
- Tuition Classes
- Student Management
- Teacher Management
- Attendance Management
- Timetable Scheduling
- Enrollment Management
- Fee Management
- Payment Tracking
- Notifications
- Reporting & Analytics
- Role Based Access Control (RBAC)

The platform supports:

- Multiple courses per student
- Individual fee per course
- Automatic monthly fee generation
- Partial payments
- Outstanding balance tracking
- Teacher attendance
- Student attendance
- Automatic timetable generation
- Principal-controlled scheduling
- Fine-grained hierarchical permissions

---

# User Roles

## Principal

Permissions

- Manage teachers
- Manage students
- Manage courses
- Manage classes
- Manage enrollments
- Create schedules
- Auto generate schedules
- View all students
- View all teachers
- View all attendance
- View fees and payments
- View reports
- View revenue analytics
- Manage system settings

---

## Teacher

Permissions

- View assigned classes
- View assigned students
- Mark attendance
- View own attendance
- View own schedule
- View student fee status
- View student profiles

Restrictions

- Cannot manage fees
- Cannot modify schedules
- Cannot view students belonging to other teachers
- Cannot access administration functions

---

## Student

Permissions

- View own profile
- View enrolled courses
- View class schedule
- View attendance
- View fee summary
- View payment history
- Download receipts

Restrictions

- Cannot access other students' data
- Cannot access teacher information
- Cannot update academic records

---

# Technology Stack

## Backend

- Java 21
- Spring Boot 3.x
- Spring Cloud
- Spring Security
- Spring Data JPA
- Hibernate
- Maven

## Database

- PostgreSQL

## Messaging

- Apache Kafka

## Caching

- Redis

## Frontend
(Use the sample figma project defined in C:\SAPDevelop\artacademy\Art Academy with Attendance System.zip to get the look and feel of the project)
- React
- TypeScript
- Redux Toolkit
- Material UI

## Infrastructure

- Spring Cloud Gateway
- Eureka Service Registry
- Config Server
- Docker
- Kubernetes
- Helm

## Documentation

- OpenAPI / Swagger

---

# Architecture Principles

The platform follows:

- Microservices Architecture
- Event Driven Architecture
- Database Per Service Pattern
- Domain Driven Design
- RESTful Services
- JWT Security
- RBAC Authorization
- Stateless Services

---

# High Level Architecture

```text
                       React Frontend
                              |
                              |
                              ?

                     API Gateway Service

                              |
        -------------------------------------------------

          Auth Service

          User Service

          Course & Enrollment Service

          Attendance Service

          Scheduling Service

          Payment Service

          Notification Service

          Reporting Service

        -------------------------------------------------

                        Kafka Event Bus

        -------------------------------------------------

              PostgreSQL Database Per Service
```

---

# Microservices

# 1. API Gateway Service

## Responsibilities

- Entry point for all APIs
- JWT validation
- Routing
- Logging
- CORS handling
- Rate limiting

## Database

None

---

# 2. Authentication Service

## Responsibilities

- Authentication
- Authorization
- JWT Management
- Role Management
- Password Reset
- Refresh Tokens

## Database

```text
auth_db
```

## Tables

### users

```sql
id
username
password
email
status
created_at
updated_at
```

### roles

```sql
id
name
```

### user_roles

```sql
id
user_id
role_id
```

### refresh_tokens

```sql
id
user_id
token
expiry_date
```

## APIs

```http
POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/change-password

POST /auth/reset-password

GET /auth/me
```

---

# 3. User Management Service

## Responsibilities

- Student Management
- Teacher Management
- Principal Profiles
- Teacher Availability

## Database

```text
user_db
```

## Tables

### teachers

```sql
id
user_id
employee_code
name
email
phone
qualification
joining_date
status
```

### students

```sql
id
user_id
admission_number
name
dob
father_name
mother_name
guardian_name
email
phone
address
status
```

### teacher_availability

```sql
id
teacher_id
day_of_week
start_time
end_time
```

## APIs

### Teachers

```http
GET /teachers

GET /teachers/{id}

POST /teachers

PUT /teachers/{id}

DELETE /teachers/{id}
```

### Students

```http
GET /students

GET /students/{id}

POST /students

PUT /students/{id}

DELETE /students/{id}
```

### Teacher Availability

```http
GET /teachers/{id}/availability

PUT /teachers/{id}/availability
```

---

# 4. Course & Enrollment Service

## Responsibilities

- Course Management
- Class Management
- Student Enrollment
- Course Fee Management

---

## Course Types

### Art Academy Courses

- Pencil Drawing
- Sketching
- Watercolor
- Acrylic Painting
- Oil Painting
- Portrait Drawing
- Landscape Art

### Tuition Courses

- Mathematics
- Science
- English
- Social Science
- Physics
- Chemistry
- Biology

---

## Database

```text
academic_db
```

---

## Courses

```sql
courses
(
 id BIGSERIAL PRIMARY KEY,

 course_code VARCHAR(50) UNIQUE,

 course_name VARCHAR(200),

 course_type VARCHAR(50),

 description TEXT,

 monthly_fee NUMERIC(12,2),

 admission_fee NUMERIC(12,2),

 duration_months INTEGER,

 status VARCHAR(20)
)
```

### Constraints

```sql
CHECK(monthly_fee >= 0)

CHECK(admission_fee >= 0)
```

---

## Classes

```sql
classes
(
 id BIGSERIAL PRIMARY KEY,

 course_id BIGINT NOT NULL,

 teacher_id BIGINT NOT NULL,

 class_name VARCHAR(255),

 room_number VARCHAR(50),

 capacity INTEGER,

 status VARCHAR(20)
)
```

---

## Enrollments

```sql
enrollments
(
 id BIGSERIAL PRIMARY KEY,

 student_id BIGINT NOT NULL,

 course_id BIGINT NOT NULL,

 class_id BIGINT NOT NULL,

 enrollment_date DATE,

 status VARCHAR(20)
)
```

### Relationships

```sql
FOREIGN KEY(student_id)
REFERENCES students(id)

FOREIGN KEY(course_id)
REFERENCES courses(id)

FOREIGN KEY(class_id)
REFERENCES classes(id)
```

### Constraint

```sql
UNIQUE(student_id, course_id)
```

### Business Rule

```text
Student cannot have more than
one active enrollment for
the same course.
```

---

## APIs

```http
GET /courses

GET /courses/{id}

POST /courses

PUT /courses/{id}

DELETE /courses/{id}

GET /classes

GET /classes/{id}

POST /classes

PUT /classes/{id}

DELETE /classes/{id}

POST /enrollments

GET /enrollments/{studentId}

DELETE /enrollments/{id}
```

---

# 5. Attendance Service

## Responsibilities

- Teacher Attendance
- Student Attendance

## Database

```text
attendance_db
```

---

## Teacher Attendance

```sql
teacher_attendance
(
 id,
 teacher_id,
 attendance_date,
 status,
 remarks
)
```

---

## Student Attendance

```sql
student_attendance
(
 id,
 student_id,
 class_id,
 attendance_date,
 status,
 remarks
)
```

---

## Attendance Status

```text
PRESENT

ABSENT

LEAVE

HALF_DAY
```

---

## APIs

```http
POST /attendance/teachers

GET /attendance/teachers/{teacherId}

POST /attendance/students

GET /attendance/students/{studentId}
```

---

# 6. Scheduling Service

## Responsibilities

- Timetable generation
- Room allocation
- Teacher allocation
- Schedule conflict validation

## Database

```text
schedule_db
```

---

## Tables

### rooms

```sql
id
room_name
capacity
```

### schedules

```sql
id
class_id
teacher_id
room_id
start_time
end_time
day_of_week
```

---

## Scheduling Rules

### Teacher Rules

```text
Teacher cannot be assigned
to multiple classes
at the same time.
```

### Room Rules

```text
Room cannot be double booked.
```

### Availability Rules

```text
Teacher availability
must be respected.
```

---

## APIs

```http
POST /schedules

POST /schedules/generate

GET /schedules

GET /schedules/{id}

PUT /schedules/{id}

DELETE /schedules/{id}

GET /schedules/teacher/{teacherId}

GET /schedules/student/{studentId}
```

---

# 7. Payment Service

## Responsibilities

- Monthly Fee Generation
- Student Billing
- Course Wise Fee Tracking
- Partial Payments
- Outstanding Tracking
- Receipts
- Revenue Reporting

---

# Fee Model

The platform uses an Enrollment Based Billing Model.

Each enrolled course contributes to the student's monthly fee.

Example:

```text
Drawing      ?1000

Painting     ?1500

Maths        ?2000

Total Fee    ?4500
```

---

# Fee Status

## Overall Status

```text
PAID

PARTIAL

UNPAID
```

## Course Status

```text
PAID

PARTIAL

UNPAID
```

---

# Database

```text
payment_db
```

---

# Entity Relationship Model

```text
Student
   |
   | 1:N
   |
Student Fee Cycle
   |
   | 1:N
   |
Student Fee Detail
   |
   | N:1
   |
Enrollment
   |
   | N:1
   |
Course

Student Fee Cycle
   |
   | 1:N
   |
Payments
   |
   | 1:N
   |
Payment Allocations
   |
   | N:1
   |
Student Fee Detail
```

---

# Student Fee Cycles

Represents monthly invoices.

```sql
student_fee_cycles
(
 id BIGSERIAL PRIMARY KEY,

 student_id BIGINT NOT NULL,

 billing_month INTEGER NOT NULL,

 billing_year INTEGER NOT NULL,

 total_amount NUMERIC(12,2) NOT NULL,

 paid_amount NUMERIC(12,2) DEFAULT 0,

 outstanding_amount NUMERIC(12,2) NOT NULL,

 status VARCHAR(20),

 generated_date TIMESTAMP,

 due_date TIMESTAMP
)
```

### Relationships

```sql
FOREIGN KEY(student_id)
REFERENCES students(id)
```

### Constraints

```sql
UNIQUE
(
 student_id,
 billing_month,
 billing_year
)
```

```sql
CHECK(total_amount >= 0)

CHECK(paid_amount >= 0)

CHECK(outstanding_amount >= 0)
```

---

# Student Fee Details

Course wise fee breakdown.

```sql
student_fee_details
(
 id BIGSERIAL PRIMARY KEY,

 fee_cycle_id BIGINT NOT NULL,

 student_id BIGINT NOT NULL,

 enrollment_id BIGINT NOT NULL,

 course_id BIGINT NOT NULL,

 course_fee NUMERIC(12,2),

 allocated_paid_amount NUMERIC(12,2),

 outstanding_amount NUMERIC(12,2),

 status VARCHAR(20)
)
```

### Relationships

```sql
FOREIGN KEY(fee_cycle_id)
REFERENCES student_fee_cycles(id)

FOREIGN KEY(student_id)
REFERENCES students(id)

FOREIGN KEY(enrollment_id)
REFERENCES enrollments(id)

FOREIGN KEY(course_id)
REFERENCES courses(id)
```

### Constraint

```sql
UNIQUE
(
 fee_cycle_id,
 enrollment_id
)
```

---

# Payments

```sql
payments
(
 id BIGSERIAL PRIMARY KEY,

 fee_cycle_id BIGINT NOT NULL,

 student_id BIGINT NOT NULL,

 amount NUMERIC(12,2) NOT NULL,

 payment_mode VARCHAR(50),

 transaction_reference VARCHAR(200),

 payment_date TIMESTAMP,

 remarks TEXT
)
```

### Relationships

```sql
FOREIGN KEY(fee_cycle_id)
REFERENCES student_fee_cycles(id)

FOREIGN KEY(student_id)
REFERENCES students(id)
```

### Constraints

```sql
CHECK(amount > 0)
```

---

# Payment Allocations

```sql
payment_allocations
(
 id BIGSERIAL PRIMARY KEY,

 payment_id BIGINT NOT NULL,

 fee_detail_id BIGINT NOT NULL,

 allocated_amount NUMERIC(12,2)
)
```

### Relationships

```sql
FOREIGN KEY(payment_id)
REFERENCES payments(id)

FOREIGN KEY(fee_detail_id)
REFERENCES student_fee_details(id)
```

### Constraint

```sql
CHECK(allocated_amount > 0)
```

---

# Fee Allocation Rule

```text
SUM(payment_allocations.allocated_amount)
must never exceed
payments.amount
```

Validation can be enforced via:

- Database Trigger
- Service Layer Validation

---

# Billing Rules

## Full Payment

```text
Outstanding = 0

Status = PAID

All courses = PAID
```

---

## Partial Payment

Example

```text
Total Fee = 4500

Payment = 3000
```

Result

```text
Overall Status = PARTIAL

Drawing = PARTIAL

Painting = PARTIAL

Maths = PARTIAL
```

Rule

```text
Until total invoice amount
is fully paid,

all course statuses
remain PARTIAL.
```

---

## Unpaid

```text
Paid Amount = 0

Overall Status = UNPAID

All course statuses = UNPAID
```

---

# Monthly Fee Generation

Runs:

```text
Day 1 of Every Month
```

Process:

```text
1. Read active enrollments

2. Read course fees

3. Create fee cycle

4. Create fee details

5. Publish FeeGeneratedEvent

6. Notify students
```

---

## APIs

```http
POST /fees/generate

GET /fees/student/{studentId}

GET /fees/student/{studentId}/courses

GET /fees/outstanding/{studentId}

POST /payments

GET /payments/student/{studentId}

GET /fees/defaulters

GET /fees/revenue-summary
```

---

# 8. Notification Service

## Responsibilities

- Email Notifications
- SMS Notifications
- Fee Reminders
- Schedule Updates
- Attendance Alerts

## Database

```text
notification_db
```

## APIs

```http
POST /notifications/send

GET /notifications/{userId}
```

---

# 9. Reporting Service

## Responsibilities

- Attendance Reports
- Revenue Reports
- Fee Reports
- Defaulter Reports
- Student Reports
- Teacher Reports

## Database

```text
reporting_db
```

## APIs

```http
GET /reports/attendance

GET /reports/revenue

GET /reports/students

GET /reports/teachers

GET /reports/fees

GET /reports/defaulters
```

---

# Event Driven Architecture

## Kafka Topics

### Academic Events

```text
student-created

teacher-created

enrollment-created

enrollment-cancelled
```

### Attendance Events

```text
attendance-recorded

attendance-updated
```

### Payment Events

```text
fee-generated

payment-received

fee-status-updated
```

### Schedule Events

```text
schedule-generated

schedule-updated
```

### Notification Events

```text
notification-request
```

---

# Security Architecture

## Authentication

- JWT Access Tokens
- Refresh Tokens

## Authorization

Role Based Access Control

```text
PRINCIPAL

TEACHER

STUDENT
```

Hierarchy

```text
PRINCIPAL
    |
    ??? TEACHER
            |
            ??? STUDENT
```

---

# Frontend Modules

## Principal Portal

- Dashboard
- Teachers
- Students
- Courses
- Classes
- Enrollments
- Timetable Planner
- Attendance Reports
- Revenue Reports
- Defaulters
- Analytics

---

## Teacher Portal

- Dashboard
- Attendance
- Assigned Students
- Student Fee Status
- Schedule

---

## Student Portal

- Dashboard
- Profile
- Attendance
- Schedule
- Course Enrollments
- Monthly Fees
- Fee Breakdown
- Outstanding Amount
- Receipts

---

# Deployment Structure

```text
art-academy-platform

??? api-gateway
??? service-registry
??? config-server

??? auth-service
??? user-service
??? course-enrollment-service
??? attendance-service
??? scheduling-service
??? payment-service
??? notification-service
??? reporting-service

??? common-library
?   ??? security
?   ??? dto
?   ??? events
?   ??? exceptions
?   ??? utilities

??? frontend-react

??? docker

??? kubernetes

??? documentation
```

---

# Non Functional Requirements

## Performance

- API response time under 2 seconds
- Support 5000+ students
- Support multiple branches

## Scalability

- Horizontal scaling
- Kubernetes deployment
- Stateless services

## Security

- JWT Authentication
- BCrypt Password Encryption
- RBAC
- Audit Logging
- HTTPS

## Availability

- 99.9% uptime

---

# Deliverables

## Backend

- Spring Boot Microservices
- PostgreSQL Schemas
- Flyway Migrations
- Kafka Integration
- Eureka Registration
- Config Server
- API Gateway
- Swagger Documentation

## Frontend

- React Application
- Responsive UI
- Role Based Navigation
- Dashboards

## DevOps

- Dockerfiles
- Docker Compose
- Kubernetes Manifests
- Helm Charts
- CI/CD Pipeline

## Documentation

- Architecture Diagram
- ER Diagram
- OpenAPI Specifications
- User Guide
- Deployment Guide
- API Documentation