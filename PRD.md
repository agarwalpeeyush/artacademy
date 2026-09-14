# Art Academy Platform — Product Requirements Document (PRD)

## 1. Purpose

The Art Academy Platform digitises the operations of an art academy / tuition centre: enrolment, timetabling, attendance, fee collection, and communication across four user roles — **Principal** (administrator), **Teacher**, **Student**, and **Parent**. This document catalogues the functional requirements and features currently implemented.

## 2. Scope

In scope: authentication & user administration; academy management (teachers, students, parents, courses, course types, enrolments); **timetabling** (weekly slots per course/teacher, conflicts, upcoming projection); **attendance** (per timetable slot + date, with recorded session times and a direct-edit correction audit); exams; fees & payments; notifications & announcements; and reporting/analytics.

The model is **course + weekly timetable slot (batch)** — there is no separate "class" entity, and no standalone timetable service (timetabling is part of the course-enrollment-service).

Out of scope: external payment-gateway integration, SMS delivery (channel modelled but email is the live transport), PWA/offline, push notifications, and multi-tenancy.

## 3. Roles & Personas

| Role | Persona | Primary goals |
|------|---------|---------------|
| Principal | Academy administrator | Run the academy: manage people, courses, timetable, exams, fees; monitor attendance, revenue, and system activity |
| Teacher | Instructor | Mark attendance, view own timetable & students, edit attendance, manage own availability, broadcast announcements when permitted |
| Student | Learner | See timetable/upcoming classes, track attendance, view & pay fees, download receipts |
| Parent | Guardian | Monitor children's attendance, upcoming classes and fees; pay fees; receive notifications |

> A person may hold multiple roles. Principal takes precedence in routing and role-gated screens — a principal who also teaches operates as a principal (e.g. can mark attendance on behalf of any teacher).

## 4. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Security | JWT bearer auth; BCrypt password hashing; role-based route guards (gateway + frontend); login rate limiting (5 failures → 15-min lock); audit logging of security events |
| Availability | Stateless services behind Eureka; independently deployable and scalable |
| Data integrity | Database-per-service; Flyway `validate` migrations; idempotent, profile-gated seed data |
| Consistency | Event-driven (Kafka) cross-service propagation; shared UUID identity across DBs; WebClient name-enrichment on read paths |
| Observability | Centralised JSON logging via ELK; per-service Swagger/OpenAPI |
| Portability | Docker Compose, Kubernetes manifests, and Helm chart provided |

---

## 5. Functional Requirements by Domain

### 5.1 Authentication & Account Management

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| AUTH-1 | Login | All | Username + password; returns JWT + refresh token; role-based landing page |
| AUTH-2 | Logout | All | Invalidate refresh tokens server-side; audited |
| AUTH-3 | Token refresh | All | Issue a new access token from a refresh token |
| AUTH-4 | Forgot / reset password | All | Request a reset token by email (1-hour, one-use); reset via tokenised link; email sent via Kafka → notification-service |
| AUTH-5 | Change password | All | Authenticated password change (blocked for the bootstrap admin) |
| AUTH-6 | Login rate limiting | System | Lock an account for 15 min after 5 failed attempts |
| AUTH-7 | Account activation/deactivation | Principal | Toggle ACTIVE/INACTIVE; deactivated users cannot log in |
| AUTH-8 | User management | Principal | Paginated list of all users with status & roles |
| AUTH-9 | Role management | Principal | View/replace a user's roles (multi-select) |
| AUTH-10 | Audit log | Principal | Records logins, failures, logout, password events with IP; filter by username, paginated |
| AUTH-11 | Bootstrap admin | System | A single seeded `admin` account can only create the first Principal, then self-deactivates |

### 5.2 People — Teachers, Students, Parents

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| PPL-1 | Teacher CRUD | Principal | Create/list/edit/delete teachers (employee code, qualification, contact, joining date) |
| PPL-2 | Teacher detail | Principal | Profile with timetable, attendance, availability |
| PPL-3 | Student CRUD | Principal | Create/list/edit/delete students (DOB, guardians, contact, address, enrolment date) |
| PPL-4 | Student detail | Principal | Profile with enrolments, attendance summary, fee history, timetable |
| PPL-5 | Student self-profile | Student | View and edit own contact details |
| PPL-6 | Parent profiles & linking | Principal/Parent | Parent entity linked to student(s); auto-provisioned when a student names a new guardian; parent portal reads linked child data |
| PPL-7 | Search / filter / sort | Principal | On list pages (students, teachers, courses, enrolments) |
| PPL-8 | Teacher weekly availability | Teacher/Principal | Recurring available time slots per day-of-week |
| PPL-9 | Teacher availability exceptions | Teacher | One-off unavailable dates (leave/sick), all-day or partial; add/list/delete |

### 5.3 Academy — Courses, Enrolments, Exams

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| ACD-1 | Course CRUD | Principal | Course code/name/type, description, duration, and a set of fee lines |
| ACD-2 | Course type CRUD | Principal | Manage course-type reference data |
| ACD-3 | Course detail | Principal | Description, fees, timetable slots, enrolled students |
| ACD-4 | Enrolment management | Principal/Teacher | Enrol a student into a course (unique per student+course); assign timetable slots; override fee lines; change status; soft-cancel |
| ACD-5 | Enrolment views | Student/Parent | View active/inactive enrolments and their assigned slots |
| ACD-6 | Exam scheduling | Principal | Schedule an exam for a course; generates one-time exam fees for enrolled students and notifies them |

### 5.4 Timetable

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| TT-1 | Timetable builder | Principal | Create weekly slots: course + teacher + day-of-week + start/end time |
| TT-2 | Conflict detection | Principal | Detect teacher double-booking / course overlap across slots |
| TT-3 | Teacher timetable | Teacher/Principal | Slots for a teacher |
| TT-4 | Course timetable | Principal/Teacher | Slots for a course (drives the attendance batch picker) |
| TT-5 | Student timetable | Student/Parent | Slots the student's enrolments are assigned to |
| TT-6 | Upcoming classes | Student/Parent | Next sessions projected onto calendar dates, chronological |

### 5.5 Attendance

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| ATT-1 | Mark student attendance | Teacher/Principal | Cascade Course → Teacher → Batch (slot) → Date; mark each student PRESENT/ABSENT; date is independent of the slot's weekday (extra/rescheduled classes supported) |
| ATT-2 | Recorded session times | Teacher/Principal | Actual start/end time prefill from the slot, are editable, and persist on the records; the timetable is never changed |
| ATT-3 | Add-student (make-up) | Teacher/Principal | Add an off-roster student to a session (make-up / other batch) |
| ATT-4 | Bulk-range marking | Teacher/Principal | Apply a status across a date range for the roster |
| ATT-5 | Student attendance view & stats | Student/Teacher/Principal | History by course/date; summary percentage (half-day = 0.5) |
| ATT-6 | Teacher self-attendance | Teacher/Principal | Record own attendance per slot + date |
| ATT-7 | Attendance correction (direct edit) | Teacher/Principal | Edit a record's status with a reason; every edit writes an audit-log row (no approval step) |
| ATT-8 | Attendance report & analytics | Principal | Filter by subject/date range; monthly & per-course summaries; below-threshold exceptions; CSV export |

### 5.6 Fees & Payments

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| FEE-1 | Fee generation | Principal | Generate monthly fee cycles for active students from the enrolment read-cache; one-time (admission/exam) cycles are created on the driving event |
| FEE-2 | Fee cycle view | Student/Parent | Billing period, total/paid/outstanding, status (PAID/PARTIAL/UNPAID) |
| FEE-3 | Fee detail breakdown | All | Per-course line items within a cycle |
| FEE-4 | Make payment | Student/Parent | Record a payment against a cycle; FIFO allocation across fee details |
| FEE-5 | Receipts | Student/Parent | View/download a payment receipt (PDF) |
| FEE-6 | Outstanding / defaulters | Principal/Teacher | Students with outstanding balances |
| FEE-7 | Revenue summary | Principal | Billed vs collected vs outstanding by month/year |

### 5.7 Notifications & Announcements

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| NTF-1 | Absent alert | System→Student | On `attendance-recorded` when status is ABSENT |
| NTF-2 | Fee reminder | System→Student | On `fee-generated` |
| NTF-3 | Payment confirmation | System→Student | On `payment-received` |
| NTF-4 | Exam notice | System→Students | On `exam-scheduled` |
| NTF-5 | Notification centre | All | View notifications, mark read/read-all, unread count |
| NTF-6 | Announcements | Principal/Teacher | Principal broadcasts to audiences; teachers broadcast to their students when granted permission |
| NTF-7 | Broadcast permission | Principal | Grant/revoke a teacher's announcement permission |

### 5.8 Reporting & Analytics

| ID | Feature | Role | Description |
|----|---------|------|-------------|
| RPT-1 | Principal dashboard | Principal | Totals: students, teachers, courses, active enrolments, revenue, pending fees, today's attendance |
| RPT-2 | Teacher dashboard | Teacher | Weekly slot count, today's timetable |
| RPT-3 | Student dashboard | Student | Active enrolments, attendance %, outstanding fees, today's classes |
| RPT-4 | Parent dashboard | Parent | Children count, average attendance, total outstanding |
| RPT-5 | Revenue analytics | Principal | Revenue by period |
| RPT-6 | Defaulters | Principal | Outstanding-fee list |
| RPT-7 | Attendance analytics | Principal | Trends, monthly summaries, exception reports, CSV export |

---

## 6. Key Business Rules

1. **Identity is shared**: a person's UUID is identical across auth, user, academic, attendance, and payment databases; `username == loginId`.
2. **Course/timetable model**: there is no "class". A course has weekly timetable slots (batches); an enrolment is assigned to one or more slots.
3. **Enrolment uniqueness**: one enrolment per `(student, course)`; cancellation is a soft status change.
4. **Attendance keying**: one student-attendance row per `(student, timetable slot, date)` and one teacher-attendance row per `(teacher, slot, date)`. The date is independent of the slot's weekday, so extra/rescheduled sessions are supported.
5. **Recorded times, immutable plan**: session start/end times are copied onto attendance at write time and stay editable there; the timetable slot (the plan) is never modified by marking attendance.
6. **Correction is a direct edit**: any authorised edit updates the record and writes an audit-log row (editor, role, old/new status, reason, timestamp). There is no approve/reject workflow.
7. **Fee cycles**: one cycle per `(student, month, year, kind, source)`; status derives from paid vs total; payments allocate FIFO across fee details.
8. **Security lockout**: 5 failed logins lock an account for 15 minutes; deactivated accounts cannot authenticate; the bootstrap admin cannot change its password and self-deactivates after the first principal is created.
9. **Clean-slate data**: schema is created by Flyway; demo data is loaded only under the `docker`/`dev` profile via `V2__seed_dev_data.sql`.

## 7. Assumptions & Constraints

- Payment capture is an internal record (no external gateway integration).
- Notifications are delivered by email (Gmail SMTP); an SMS channel is modelled on the event/entity but is not wired to a live transport. The in-app notification list is available to all roles.
- Timetables are modelled weekly (day-of-week + time); "upcoming" projects them onto the next calendar dates server-side.
- The only seeded account is a bootstrap `admin` (local-dev default password `Admin@1234`, overridable via `BOOTSTRAP_ADMIN_USERNAME`/`BOOTSTRAP_ADMIN_PASSWORD`); real users (principal, teachers, students, parents) are created at runtime. Bootstrap credentials are for local/testing only and must be rotated before production.
