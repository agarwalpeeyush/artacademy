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
| Painting class | `…0d01…0001` | teacher1 `…0002…0001`, Studio 1, Mon & Wed 10:00–11:30, PUBLISHED |
| Sculpture class | `…0d02…0001` | teacher2 `…0002…0002`, Studio 2, Tue & Thu 14:00–15:30, PUBLISHED |

## API scenarios

| # | Scenario | Request | Expected result |
|---|----------|---------|-----------------|
| 1 | List all timetables as principal | `GET /timetables` (PRINCIPAL) | `200` with all rows, DRAFT **and** PUBLISHED (the 4 seeded PUBLISHED rows to start). |
| 2 | Create a draft session | `POST /timetables` (PRINCIPAL) with class/teacher/room/day/times | `201`; response `status = DRAFT`, `publishedAt = null`. |
| 3 | Draft not visible to teacher/student | `GET /timetables/teacher/{teacherId}`, `GET /timetables/class/{classId}`, `GET /timetables/student/{studentId}?classIds=…` | `200`; the new DRAFT row is **absent** (published-only views). |
| 4 | Publish → becomes visible | `POST /timetables/{id}/publish` (PRINCIPAL), then re-run the teacher/class/student read | Publish returns `status = PUBLISHED` with a `publishedAt` timestamp; the row now **appears** in the consumer views. |
| 5 | Unpublish → hidden again | `POST /timetables/{id}/unpublish` (PRINCIPAL), then re-run the reads | Returns `status = DRAFT`, `publishedAt = null`; the row **disappears** from the consumer views but still shows in `GET /timetables`. |
| 6 | Reject overlapping session | `POST /timetables` for the same teacher (or same room) on the same day overlapping an existing slot | `409 Conflict`. |
| 7 | Update a session | `PUT /timetables/{id}` (PRINCIPAL) changing time/room | `200`; fields updated, status unchanged; a `timetable-updated` event is emitted. |
| 8 | Delete a session | `DELETE /timetables/{id}` (PRINCIPAL) | `204`; subsequent `GET /timetables/{id}` → `404`. |
| 9 | Create a room | `POST /rooms` `{ "roomName": "Studio 3", "capacity": 12 }` (PRINCIPAL) | `201` with generated id. |
| 10 | Read rooms | `GET /rooms`, `GET /rooms/{id}` | `200`; Studio 1, Studio 2 (+ any created) listed. |
| 11 | Update a room | `PUT /rooms/{id}` (PRINCIPAL) | `200`; name/capacity updated. |
| 12 | Delete a room | `DELETE /rooms/{id}` (PRINCIPAL) | `204`. |
| 13 | Reject invalid room | `POST /rooms` with blank name or `capacity < 1` | `400` validation error. |
| 14 | Room availability — Studio 1 Monday | `GET /rooms/{studio1Id}/availability?day=MONDAY` | `200`; `occupied` contains a slot **10:00–11:30** (Painting); `free` contains gaps 08:00–10:00 and 11:30–20:00. |
| 15 | Room availability by date | `GET /rooms/{studio1Id}/availability?date=<a Monday>` | Same as #14 (weekday derived from the date). |
| 16 | Upcoming — ascending calendar dates | `GET /timetables/upcoming?classIds=<painting>,<sculpture>&limit=10` | `200`; each entry has a concrete `date`; list sorted ascending by `(date, startTime)`; a slot already past today rolls to next week. |
| 17 | Upcoming — empty classIds | `GET /timetables/upcoming` (no `classIds`) | `200` with `[]`. |
| 18 | Student multi-class timetable | `GET /timetables/student/{studentId}?classIds=<painting>,<sculpture>` | `200`; returns **both** Painting (Mon+Wed 10:00–11:30) and Sculpture (Tue+Thu 14:00–15:30) — 4 published rows total. |
| 19 | Student — no classIds | `GET /timetables/student/{studentId}` (blank `classIds`) | `200` with `[]`. |
| 20 | Conflicts endpoint disabled | `GET /timetables/conflicts` (PRINCIPAL) | `404 Not Found` (feature intentionally disabled). |
| 21 | Auth enforcement | Any `POST`/`PUT`/`DELETE` on `/timetables` or `/rooms` **without** a PRINCIPAL token | `401`/`403`. |

## Notes

- **Published-only rule:** `GET /timetables` and `GET /timetables/{id}` are the only endpoints
  that expose DRAFT rows. Teacher/class/student/upcoming views return PUBLISHED rows only —
  this is the crux of scenarios 3–5 and 18.
- **Kafka side effects:** creating (or generating) a session emits `timetable-generated`;
  updating emits `timetable-updated`. Publish/unpublish emit no event. There are no active
  consumers, so these are observable only on the topic itself (e.g. via a Kafka console consumer).
- **Availability window** is fixed at 08:00–20:00; free gaps outside seeded bookings are computed
  against that window.
