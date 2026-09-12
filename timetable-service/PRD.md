# Timetable Service — Product Requirements Document

## Purpose

The Timetable Service is the system of record for the Art Academy's weekly teaching schedule.
It lets the principal define **rooms** and build a **timetable** — recurring class sessions that
bind a class, a teacher and a room to a fixed day-of-week and time window — which teachers and
students can immediately see on their calendars. It also answers operational
questions: which rooms are free when, and what sessions are coming up next.

This service was renamed from the former `scheduling-service` and rebuilt clean-slate. The
previous schedule-versioning / history model has been removed; a timetable is a single row that
is live as soon as the principal creates it.

## Scope

**In scope**
- Room master data (create / read / update / delete).
- Timetable authoring by the principal: create, update, delete, auto-generate.
- Read views (teacher, class, student) — every timetable is visible once created.
- Room availability (occupied vs free slots) within a working-day window.
- Upcoming-sessions projection onto real calendar dates.
- Publishing domain events on session create/update.

**Out of scope**
- Schedule versioning / immutable history snapshots (removed with the rename).
- The conflict-dashboard endpoint (present in code but disabled — always `404`).
- Consuming events from other services (this service is a Kafka producer only).
- Attendance, enrolment, billing (owned by other services).

## Functional Requirements

| ID | Requirement | Actor | Notes |
|----|-------------|-------|-------|
| TT-01 | Build a timetable session (class + teacher + room + day + start/end) | Principal | `POST /timetables`; validates teacher & room overlap. |
| TT-02 | Auto-generate sessions for a batch of class/teacher items | Principal | `POST /timetables/generate`; FIFO packing from 08:00. |
| TT-03 | Update an existing session | Principal | `PUT /timetables/{id}`; re-validates overlap. |
| TT-04 | Delete a session | Principal | `DELETE /timetables/{id}`. |
| TT-05 | View all sessions | Any authenticated | `GET /timetables`. |
| TT-06 | View a single session by id | Any authenticated | `GET /timetables/{id}`. |
| TT-07 | Create a room | Principal | `POST /rooms`; name required (≤100), capacity ≥ 1. |
| TT-08 | List / read rooms | Any authenticated | `GET /rooms`, `GET /rooms/{id}`. |
| TT-09 | Update a room | Principal | `PUT /rooms/{id}`. |
| TT-10 | Delete a room | Principal | `DELETE /rooms/{id}`. |
| TT-11 | View a room's availability for a day | Any authenticated | `GET /rooms/{roomId}/availability?date=&day=`; occupied + free gaps within 08:00–20:00. |
| TT-12 | View a teacher's timetable | Any authenticated | `GET /timetables/teacher/{teacherId}`. |
| TT-13 | View a class's timetable | Any authenticated | `GET /timetables/class/{classId}`. |
| TT-14 | View a student's timetable across enrolled classes | Any authenticated | `GET /timetables/student/{studentId}?classIds=`; empty `classIds` → `[]`. |
| TT-15 | View upcoming sessions as calendar dates | Any authenticated | `GET /timetables/upcoming?classIds=&limit=`; ascending by date/time. |
| TT-16 | Emit a domain event on session create / update | System | `timetable-generated` on create/generate; `timetable-updated` on update. |

## Business Rules

- **PRINCIPAL-only authoring, immediate visibility.** Only the principal can create, update,
  delete or auto-generate timetables; every read view (teacher, class, student, upcoming) shows
  a session as soon as it is created — there is no draft state.
- **No double-booking.** A session cannot be created or updated if it overlaps an existing
  session for the same teacher, or the same room, on the same day (half-open overlap). Such a
  write is rejected with `409 Conflict`.
- **Room capacity ≥ 1.** Room creation/update requires a name (≤ 100 chars) and capacity of at
  least 1.
- **Working-day window.** Room availability is computed within a fixed 08:00–20:00 window.
- **Upcoming = next real occurrence.** Each weekly slot is projected onto its next calendar
  date; a session whose start time has already passed today rolls to next week.
- **Conflict dashboard disabled.** `GET /timetables/conflicts` is intentionally disabled and
  always returns `404`.

## Dependencies

- **PostgreSQL** — database `timetable_db` (tables `ROOMS`, `TIMETABLES`); schema managed by Flyway.
- **Kafka** — publishes `timetable-generated` and `timetable-updated`. No consumers today.
- **common-library** — shared `KafkaTopics`, `TimetableGeneratedEvent`, `ApiException`, and the
  JWT `JwtAuthenticationFilter` / security plumbing.
- **API Gateway (8080)** — routes external traffic to the service (also reachable directly on 8085).
- **Config Server** — supplies `timetable-service.yml`.
- **Cross-service identifiers** — `classId` and `teacherId` are UUID references to the academic
  and teacher services; they are not DB foreign keys and are not validated against those services.
