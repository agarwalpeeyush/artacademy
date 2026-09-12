# Timetable Service — Testing Guide

This guide walks through the timetable-service API end to end. Requests can go through the
**API Gateway on `8080`** (e.g. `http://localhost:8080/timetables`) or **directly to the
service on `8085`** (e.g. `http://localhost:8085/timetables`). All endpoints require a JWT;
mutating endpoints require the `PRINCIPAL` role.

## Prerequisites

- Service running with the seed data applied (start under the `docker`/dev profile so
  `V2__seed_dev_data.sql` is loaded).
- A principal JWT. Log in as the seeded admin (**password `Admin@1234`**) and use the returned
  token as `Authorization: Bearer <token>` for PRINCIPAL calls. Any authenticated token works
  for read-only views.

## Seed reference

| Entity | Id (suffix) | Details |
|--------|-------------|---------|
| Room — Studio 1 | `…0f01…0001` | capacity 20 |
| Room — Studio 2 | `…0f02…0001` | capacity 15 |
| Painting class | `…0d01…0001` | teacher1 `…0002…0001`, Studio 1, Mon & Wed 10:00–11:30 |
| Sculpture class | `…0d02…0001` | teacher2 `…0002…0002`, Studio 2, Tue & Thu 14:00–15:30 |

## API scenarios

| # | Scenario | Request | Expected result |
|---|----------|---------|-----------------|
| 1 | List all timetables | `GET /timetables` | `200` with all rows (the 4 seeded rows to start). |
| 2 | Create a session | `POST /timetables` (PRINCIPAL) with class/teacher/room/day/times | `201`; response has the new row (no `status`/`publishedAt` fields). |
| 3 | New session immediately visible | `GET /timetables/teacher/{teacherId}`, `GET /timetables/class/{classId}`, `GET /timetables/student/{studentId}?classIds=…` | `200`; the newly created row **appears** in every view right away. |
| 4 | Reject overlapping session | `POST /timetables` for the same teacher (or same room) on the same day overlapping an existing slot | `409 Conflict`. |
| 5 | Update a session | `PUT /timetables/{id}` (PRINCIPAL) changing time/room | `200`; fields updated; a `timetable-updated` event is emitted. |
| 6 | Delete a session | `DELETE /timetables/{id}` (PRINCIPAL) | `204`; subsequent `GET /timetables/{id}` → `404`. |
| 7 | Publish/unpublish removed | `POST /timetables/{id}/publish` or `/unpublish` | `404 Not Found` (endpoints no longer exist). |
| 8 | Create a room | `POST /rooms` `{ "roomName": "Studio 3", "capacity": 12 }` (PRINCIPAL) | `201` with generated id. |
| 9 | Read rooms | `GET /rooms`, `GET /rooms/{id}` | `200`; Studio 1, Studio 2 (+ any created) listed. |
| 10 | Update a room | `PUT /rooms/{id}` (PRINCIPAL) | `200`; name/capacity updated. |
| 11 | Delete a room | `DELETE /rooms/{id}` (PRINCIPAL) | `204`. |
| 12 | Reject invalid room | `POST /rooms` with blank name or `capacity < 1` | `400` validation error. |
| 13 | Room availability — Studio 1 Monday | `GET /rooms/{studio1Id}/availability?day=MONDAY` | `200`; `occupied` contains a slot **10:00–11:30** (Painting); `free` contains gaps 08:00–10:00 and 11:30–20:00. |
| 14 | Room availability by date | `GET /rooms/{studio1Id}/availability?date=<a Monday>` | Same as #13 (weekday derived from the date). |
| 15 | Upcoming — ascending calendar dates | `GET /timetables/upcoming?classIds=<painting>,<sculpture>&limit=10` | `200`; each entry has a concrete `date`; list sorted ascending by `(date, startTime)`; a slot already past today rolls to next week. |
| 16 | Upcoming — empty classIds | `GET /timetables/upcoming` (no `classIds`) | `200` with `[]`. |
| 17 | Student multi-class timetable | `GET /timetables/student/{studentId}?classIds=<painting>,<sculpture>` | `200`; returns **both** Painting (Mon+Wed 10:00–11:30) and Sculpture (Tue+Thu 14:00–15:30) — 4 rows total. |
| 18 | Student — no classIds | `GET /timetables/student/{studentId}` (blank `classIds`) | `200` with `[]`. |
| 19 | Conflicts endpoint disabled | `GET /timetables/conflicts` (PRINCIPAL) | `404 Not Found` (feature intentionally disabled). |
| 20 | Auth enforcement | Any `POST`/`PUT`/`DELETE` on `/timetables` or `/rooms` **without** a PRINCIPAL token | `401`/`403`. |

## Notes

- **Immediate visibility:** every timetable is returned by all views (`GET /timetables`,
  teacher/class/student/upcoming) as soon as the principal creates it — there is no draft state.
- **Kafka side effects:** creating (or generating) a session emits `timetable-generated`;
  updating emits `timetable-updated`. There are no active consumers, so these are observable
  only on the topic itself (e.g. via a Kafka console consumer).
- **Availability window** is fixed at 08:00–20:00; free gaps outside seeded bookings are computed
  against that window.
