# Art Academy Platform — Product Requirements Document (PRD)

## 1. Purpose

The Art Academy Platform digitises the operations of an art academy / tuition centre:
enrolment, timetabling, attendance, fee collection, and communication across four user roles —
**Principal** (administrator), **Teacher**, **Student**, and **Parent**. This document catalogues
the functional requirements and features currently implemented.

## 2. Scope

In scope: authentication & user administration, academy management (teachers, students, courses,
classes, enrolments), attendance (with a correction workflow), scheduling & timetabling (draft/
publish/history/conflicts/room availability/upcoming), fees & payments, notifications, and
reporting/analytics.

Out of scope (tracked in `TODO.md`): payment-gateway integration, PWA/offline, push
notifications, multi-tenancy, gallery/CMS, and CI/CD hardening items.

## 3. Roles & Personas

| Role | Persona | Primary goals |
|------|---------|---------------|
| Principal | Academy administrator | Run the academy: manage people, courses, timetable, fees; monitor attendance, revenue, and system activity |
| Teacher | Instructor | Mark attendance, view own schedule & students, request corrections, manage own availability |
| Student | Learner | See schedule/upcoming classes, track attendance, view & pay fees, download receipts |
| Parent | Guardian | Monitor children's attendance, upcoming classes and fees; pay fees; receive notifications |

## 4. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Security | JWT bearer auth; BCrypt password hashing; role-based route guards (backend + frontend); login rate limiting (5 failures → 15-min lock); audit logging of security events |
| Availability | Stateless services behind Eureka; independently deployable and scalable |
| Data integrity | Database-per-service; Flyway `validate` migrations; idempotent seed data |
| Consistency | Event-driven (Kafka) cross-service propagation; shared UUID identity across DBs |
| Observability | Centralised JSON logging via ELK; per-service Swagger/OpenAPI |
| Portability | Docker Compose, Kubernetes manifests, and Helm chart provided |

---

## 5. Functional Requirements by Domain

### 5.1 Authentication & Account Management

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| AUTH-1 | Login | All | Username + password; returns JWT + refresh token; role-based landing page |
| AUTH-2 | Logout | All | Invalidate session client-side; audited |
| AUTH-3 | Token refresh | All | Silent refresh of short-lived access token |
| AUTH-4 | Forgot / reset password | All | Request reset token by email; reset via tokenised link |
| AUTH-5 | Change password | All | Authenticated password change |
| AUTH-6 | Login rate limiting | System | Lock account for 15 min after 5 failed attempts |
| AUTH-7 | Account activation/deactivation | Principal | Toggle ACTIVE/INACTIVE; deactivated users cannot log in |
| AUTH-8 | User management | Principal | Paginated list of all users with status & roles |
| AUTH-9 | Role management | Principal | View/edit a user's roles (multi-select) |
| AUTH-10 | Audit log | Principal | Records logins, failures, logout, password events, role/status changes; filter by username, paginated |

### 5.2 People — Teachers, Students, Parents

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| PPL-1 | Teacher CRUD | Principal | Create/list/edit/delete teachers (employee code, qualification, contact, joining date) |
| PPL-2 | Teacher detail | Principal | Profile with assigned classes, schedule, attendance stats, availability |
| PPL-3 | Student CRUD | Principal | Create/list/edit/delete students (DOB, guardians, contact, address, enrolment date) |
| PPL-4 | Student detail | Principal | Profile with enrolments, attendance summary, fee history, schedule |
| PPL-5 | Student self-profile | Student | View and edit own contact/profile details |
| PPL-6 | Parent profiles & linking | Principal/Parent | Parent entity linked to a student; parent portal reads linked child data |
| PPL-7 | Search / filter / sort | Principal | On all list pages (students, teachers, courses, classes, enrolments) |
| PPL-8 | Teacher weekly availability | Teacher/Principal | Recurring available time slots per day-of-week |
| PPL-9 | Teacher availability exceptions | Teacher | One-off unavailable dates (leave/sick), all-day or partial-time; add/list/delete |

### 5.3 Academy — Courses, Classes, Enrolments

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| ACD-1 | Course CRUD | Principal | Course code/name/type, description, monthly & admission fee, duration |
| ACD-2 | Course detail | Principal | Description, fees, classes, teacher assignments, enrolled students |
| ACD-3 | Class CRUD | Principal | Class name, course, assigned teacher, room, capacity, status |
| ACD-4 | Enrolment management | Principal | Enrol a student into a course/class; unique per (student, course); status changes |
| ACD-5 | Enrolment views | Student/Parent | View active/inactive enrolments |

### 5.4 Attendance

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| ATT-1 | Mark student attendance | Teacher | Bulk mark present/absent for a class on a date (class session) |
| ATT-2 | Student attendance view | Student/Parent | Attendance history by class; summary percentage |
| ATT-3 | Teacher self-attendance | Teacher | Record own present/absent per day |
| ATT-4 | Class session unit | System | `ClassSession` represents a scheduled occurrence; attendance references a session |
| ATT-5 | Correction workflow | Teacher/Principal | Teacher requests a change to a past record with reason; Principal approves/rejects with note |
| ATT-6 | Attendance report | Principal | Filter by student/class/date range |
| ATT-7 | Attendance exceptions report | Principal | Students/teachers below a configurable threshold (e.g. 75%) |
| ATT-8 | Monthly / course summaries | Principal | Attendance grouped by course and month |
| ATT-9 | Export | Principal | Download attendance data as CSV |

### 5.5 Scheduling & Timetable

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| SCH-1 | Timetable builder | Principal | Assign class/teacher/room to a day-of-week + time slot |
| SCH-2 | Draft/publish workflow | Principal | Schedules start as DRAFT; publishing makes them visible to teachers/students |
| SCH-3 | Unpublish | Principal | Revert a published schedule to DRAFT |
| SCH-4 | Schedule history | Principal | Each publish snapshots the timetable into an immutable version; browse versions & entries |
| SCH-5 | Conflict dashboard | Principal | Detect teacher double-booking, room double-booking, class overlap |
| SCH-6 | Room availability | Principal | For a room + date, show occupied vs free slots within a working-day window |
| SCH-7 | Teacher schedule | Teacher | Own weekly published schedule |
| SCH-8 | Student timetable | Student | Published schedule across all enrolled classes/courses |
| SCH-9 | Upcoming classes | Student/Parent | Next N sessions in chronological (calendar-date) order |

### 5.6 Fees & Payments

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| FEE-1 | Fee generation | Principal | Generate monthly fee cycles per student from active enrolments |
| FEE-2 | Fee cycle view | Student/Parent | Billing period, total/paid/outstanding, status (PAID/PARTIAL/UNPAID) |
| FEE-3 | Fee detail breakdown | Student/Parent/Principal | Per-course line items within a cycle |
| FEE-4 | Make payment | Student/Parent | Record a payment against a fee cycle; allocation to details |
| FEE-5 | Receipts | Student/Parent | View/download payment receipts |
| FEE-6 | Outstanding / defaulters | Principal/Teacher | Students with outstanding balances |
| FEE-7 | Revenue report | Principal | Monthly/yearly collection trends |

### 5.7 Notifications

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| NTF-1 | Absent alert | System→Parent/Student | Triggered on `attendance.recorded` for an absence |
| NTF-2 | Fee reminder | System→Student/Parent | Triggered on `fee.generated` |
| NTF-3 | Payment receipt | System→Student/Parent | Triggered on `payment.received` |
| NTF-4 | Notification centre | Parent | View notifications for the account |

### 5.8 Reporting & Analytics

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| RPT-1 | Principal dashboard | Principal | Totals: students, teachers, courses, classes, active enrolments, revenue, pending fees, today's attendance % |
| RPT-2 | Teacher dashboard | Teacher | Weekly class count, today's schedule |
| RPT-3 | Student dashboard | Student | Active enrolments, attendance %, outstanding fees, today's classes |
| RPT-4 | Parent dashboard | Parent | Children count, average attendance, total outstanding |
| RPT-5 | Revenue analytics | Principal | Revenue by period |
| RPT-6 | Defaulters | Principal | Outstanding-fee list |
| RPT-7 | Attendance analytics | Principal | Trends and exception reports |

---

## 6. Key Business Rules

1. **Identity is shared**: a person's UUID is identical across auth, user, academic, attendance, schedule, and payment databases; `username == loginId`.
2. **Published-only visibility**: teachers and students only see `PUBLISHED` schedules; the Principal sees drafts and published.
3. **History is immutable**: publishing snapshots the current timetable; historical versions are never mutated.
4. **Enrolment uniqueness**: a student can be enrolled in a given course only once (`UNIQUE(STUDENT_ID, COURSE_ID)`).
5. **Attendance uniqueness**: one student-attendance row per `(student, class, date)`; one teacher-attendance row per `(teacher, date)`.
6. **Fee cycle uniqueness**: one cycle per `(student, month, year)`; status derives from paid vs total.
7. **Correction approval**: only a Principal can approve/reject a correction; approval updates the underlying attendance record.
8. **Security lockout**: 5 failed logins lock an account for 15 minutes; deactivated accounts cannot authenticate.

## 7. Assumptions & Constraints

- Payment capture is an internal record (no external gateway integration yet).
- Notifications are email/SMS via the notification-service; only the Parent portal renders an in-app notification list today.
- Schedules are modelled weekly (day-of-week + time); "upcoming" projects them onto the next calendar dates server-side.
- Seed accounts are for local/testing only and must be removed/rotated before production.
