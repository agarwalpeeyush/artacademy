# Timetable Service — Product Requirements Document

## Purpose

The Timetable Service is the system of record for the Art Academy's weekly teaching schedule.
It lets the principal define **rooms** and build a **timetable** — recurring class sessions that
bind a class, a teacher and a room to a fixed day-of-week and time window — then publish those
sessions so teachers and students can see their calendars. It also answers operational
questions: which rooms are free when, and what sessions are coming up next.

This service was renamed from the former `scheduling-service` and rebuilt clean-slate. The
previous schedule-versioning / history model has been removed; a session's lifecycle is now a
simple `DRAFT` → `PUBLISHED` status on the row itself.

## Scope

**In scope**
- Room master data (create / read / update / delete).
- Timetable authoring by the principal: create, update, delete, auto-generate.
- Draft → publish → unpublish lifecycle per session.
- Role-filtered read views (teacher, class, student) that expose published sessions only.
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
| TT-01 | Build a timetable session (class + teacher + room + day + start/end) | Principal | `POST /timetables`; created as `DRAFT`; validates teacher & room overlap. |
| TT-02 | Auto-generate sessions for a batch of class/teacher items | Principal | `POST /timetables/generate`; FIFO packing from 08:00; created as `DRAFT`. |
| TT-03 | Update an existing session | Principal | `PUT /timetables/{id}`; re-validates overlap; status unchanged. |
| TT-04 | Delete a session | Principal | `DELETE /timetables/{id}`. |
| TT-05 | Publish a draft session | Principal | `POST /timetables/{id}/publish`; stamps `publishedAt`. |
| TT-06 | Unpublish a session (revert to draft) | Principal | `POST /timetables/{id}/unpublish`; clears `publishedAt`. |
| TT-07 | View all sessions regardless of status | Principal | `GET /timetables` — authoring surface. |
| TT-08 | View a single session by id | Any authenticated | `GET /timetables/{id}`. |
| TT-09 | Create a room | Principal | `POST /rooms`; name required (≤100), capacity ≥ 1. |
| TT-10 | List / read rooms | Any authenticated | `GET /rooms`, `GET /rooms/{id}`. |
| TT-11 | Update a room | Principal | `PUT /rooms/{id}`. |
| TT-12 | Delete a room | Principal | `DELETE /rooms/{id}`. |
| TT-13 | View a room's availability for a day | Any authenticated | `GET /rooms/{roomId}/availability?date=&day=`; occupied + free gaps within 08:00–20:00. |
| TT-14 | View a teacher's published timetable | Any authenticated | `GET /timetables/teacher/{teacherId}` — published only. |
| TT-15 | View a class's published timetable | Any authenticated | `GET /timetables/class/{classId}` — published only. |
| TT-16 | View a student's published timetable across enrolled classes | Any authenticated | `GET /timetables/student/{studentId}?classIds=` — published only; empty `classIds` → `[]`. |
| TT-17 | View upcoming sessions as calendar dates | Any authenticated | `GET /timetables/upcoming?classIds=&limit=`; published only; ascending by date/time. |
| TT-18 | Emit a domain event on session create / update | System | `timetable-generated` on create/generate; `timetable-updated` on update. |

## Business Rules

- **Published-only visibility.** Only the principal's `GET /timetables` and `GET /timetables/{id}`
  expose `DRAFT` rows. All consumer views — teacher, class, student and upcoming — return
  `PUBLISHED` sessions only. A newly created (or unpublished) session is invisible to teachers
  and students until it is published.
- **Draft on create.** Every session created via `POST /timetables` or `POST /timetables/generate`
  starts as `DRAFT`; publishing is an explicit, separate action.
- **Publish stamps time; unpublish clears it.** Publishing sets `status = PUBLISHED` and
  `publishedAt = now`; unpublishing sets `status = DRAFT` and `publishedAt = null`.
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
