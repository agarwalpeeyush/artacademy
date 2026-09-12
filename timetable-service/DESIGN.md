# Timetable Service — Detail Design Document

## 1. Overview

The Timetable Service owns the weekly teaching schedule of the Art Academy: it stores the
rooms of the academy and the recurring class sessions (timetables) that place a class, a
teacher and a room into a fixed day-of-week + time window. It also exposes read-only,
role-filtered views for teachers, students and the principal, plus room-availability and
"upcoming sessions" projections.

This module was **renamed from the old `scheduling-service`**. As part of that rename the
service was rebuilt clean-slate:

- The package root moved from `com.artacademy.scheduling` to `com.artacademy.timetable`.
- The database moved from `schedule_db` to `timetable_db`.
- The domain terminology moved from *schedule* to *timetable*.
- **The schedule-version / history model was removed entirely.** The old
  `SCHEDULES` + `SCHEDULE_VERSIONS` + `SCHEDULE_VERSION_ENTRIES` tables and their
  versioning/snapshot workflow no longer exist. There are now only two tables: `ROOMS` and
  `TIMETABLES`.

A timetable row is created by the principal and is immediately visible to teachers and
students — there is no draft/publish lifecycle.

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| Service name | `timetable-service` |
| HTTP port | `8085` |
| Database | `timetable_db` (PostgreSQL) |
| Package root | `com.artacademy.timetable` |
| Spring Boot | 3.3.4 |
| Java | 21 |
| Datasource URL | `jdbc:postgresql://localhost:15432/timetable_db` |
| JPA `ddl-auto` | `validate` (schema owned by Flyway) |
| Migrations | `classpath:db/migration` (+ `classpath:db/seed` under `docker` profile) |
| Config source | `config-server/.../config/timetable-service.yml` |
| Security | Stateless JWT (`JwtAuthenticationFilter`), `@EnableMethodSecurity` |
| Kafka role | Producer only (no consumers) |

## 3. Component Structure

Package tree as it exists in `src/main/java`:

```
com.artacademy.timetable
├── TimetableServiceApplication.java
├── config
│   ├── KafkaProducerConfig.java        # idempotent JSON producer, acks=all, retries=3
│   └── SecurityConfig.java             # JWT filter chain, PRINCIPAL-only mutations
├── controller
│   ├── TimetableController.java        # /timetables
│   └── RoomController.java             # /rooms
├── domain
│   ├── Timetable.java                  # @Table("TIMETABLES")
│   └── Room.java                       # @Table("ROOMS")
├── dto
│   ├── TimetableRequest.java
│   ├── TimetableResponse.java
│   ├── GenerateTimetableRequest.java   # items[]: classId, teacherId, preferredDayOfWeek, durationMinutes
│   ├── RoomRequest.java
│   ├── RoomResponse.java
│   ├── RoomAvailabilityResponse.java   # occupied[] + free[] of Slot
│   ├── UpcomingClassResponse.java
│   └── TimetableConflictResponse.java  # used only by an unused service method (see §6)
├── mapper
│   ├── TimetableMapper.java
│   └── RoomMapper.java
├── repository
│   ├── TimetableRepository.java
│   └── RoomRepository.java
└── service
    ├── TimetableService.java
    └── RoomService.java
```

## 4. Domain Model

### Timetable (`TIMETABLES`)

| Field | Type | Column | Notes |
|-------|------|--------|-------|
| `id` | `UUID` | `ID` | PK, `@UuidGenerator` |
| `classId` | `UUID` | `CLASS_ID` | not null; foreign identifier into the academic service |
| `teacherId` | `UUID` | `TEACHER_ID` | not null; foreign identifier into the teacher service |
| `room` | `Room` | `ROOM_ID` | `@ManyToOne(LAZY)`, not null, FK → `ROOMS` |
| `startTime` | `LocalTime` | `START_TIME` | not null |
| `endTime` | `LocalTime` | `END_TIME` | not null |
| `dayOfWeek` | `DayOfWeek` | `DAY_OF_WEEK` | not null, `EnumType.STRING`, length 20 (`MONDAY`…`SUNDAY`) |

### Room (`ROOMS`)

| Field | Type | Column | Notes |
|-------|------|--------|-------|
| `id` | `UUID` | `ID` | PK, `@UuidGenerator` |
| `roomName` | `String` | `ROOM_NAME` | not null, length 100 |
| `capacity` | `Integer` | `CAPACITY` | not null (validated `>= 1` on the request) |

There are **no** schedule-version, snapshot or history entities. The service is the sole
writer of both tables.

## 5. Database Schema

Full `V1__init_timetable_schema.sql`:

```sql
-- Timetable service schema (timetable_db).

CREATE TABLE ROOMS (
    ID        UUID PRIMARY KEY,
    ROOM_NAME VARCHAR(100) NOT NULL,
    CAPACITY  INTEGER NOT NULL
);

CREATE TABLE TIMETABLES (
    ID           UUID PRIMARY KEY,
    CLASS_ID     UUID NOT NULL,
    TEACHER_ID   UUID NOT NULL,
    ROOM_ID      UUID NOT NULL,
    START_TIME   TIME NOT NULL,
    END_TIME     TIME NOT NULL,
    DAY_OF_WEEK  VARCHAR(20) NOT NULL,
    CONSTRAINT fk_timetables_room FOREIGN KEY (ROOM_ID) REFERENCES ROOMS (ID)
);

CREATE INDEX idx_timetables_teacher_id ON TIMETABLES (TEACHER_ID);
CREATE INDEX idx_timetables_class_id ON TIMETABLES (CLASS_ID);
CREATE INDEX idx_timetables_room_id ON TIMETABLES (ROOM_ID);
CREATE INDEX idx_timetables_day_of_week ON TIMETABLES (DAY_OF_WEEK);
```

Notes:
- `ROOM_ID` is a hard FK (`fk_timetables_room`). `CLASS_ID` and `TEACHER_ID` are plain UUIDs
  (cross-service references, no DB FK).
- No unique constraint on the timetable slot — overlap/double-booking is enforced in the
  service layer at write time (see §7).

## 6. REST API

All endpoints are served under the service root (gateway `8080` or direct `8085`). All
requests require a valid JWT; mutating verbs additionally require the `PRINCIPAL` role, which
is enforced both by `SecurityConfig` (POST/PUT/DELETE on `/rooms/**` and `/timetables/**`) and
by `@PreAuthorize("hasRole('PRINCIPAL')")` on the handler.

### `/timetables`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/timetables` | Any authenticated | Return **all** timetables. |
| GET | `/timetables/{id}` | Any authenticated | Return one timetable by id. |
| POST | `/timetables` | PRINCIPAL | Create a timetable. Validates teacher/room overlap. Publishes `timetable-generated`. Returns `201`. |
| POST | `/timetables/generate` | PRINCIPAL | Auto-generate timetables for a list of class/teacher items (see §7). Returns `201`. |
| PUT | `/timetables/{id}` | PRINCIPAL | Update slot fields (class/teacher/room/times/day). Re-validates overlap. Publishes `timetable-updated`. |
| DELETE | `/timetables/{id}` | PRINCIPAL | Delete a timetable. `404` if missing. Returns `204`. |
| GET | `/timetables/conflicts` | PRINCIPAL | **Disabled.** Always returns `404 Not Found` (screen temporarily disabled — see below). |
| GET | `/timetables/upcoming?classIds=&limit=` | Any authenticated | Next N session occurrences projected onto calendar dates, ascending (see §7). |
| GET | `/timetables/teacher/{teacherId}` | Any authenticated | Timetables for a teacher. |
| GET | `/timetables/class/{classId}` | Any authenticated | Timetables for a class. |
| GET | `/timetables/student/{studentId}?classIds=` | Any authenticated | Timetables across the student's enrolled classes. Empty `classIds` returns `[]`. |

**Visibility.** Every timetable is visible to any authenticated user as soon as the principal
creates it; there is no draft state to gate teacher/student views.

**`/conflicts` — actual state.** The endpoint is **mapped but hard-disabled**: the handler is
annotated `@GetMapping("/conflicts")` + `@PreAuthorize("hasRole('PRINCIPAL')")` but its body is
literally `return ResponseEntity.notFound().build();`, so it always answers `404`. A working
`TimetableService.getConflicts()` implementation still exists in the service class (a pairwise
overlap scan producing `TEACHER_DOUBLE_BOOKED` / `ROOM_DOUBLE_BOOKED` / `CLASS_OVERLAP`
entries via `TimetableConflictResponse`), but the controller does **not** call it. Treat the
conflicts feature as inactive.

**`/upcoming` query params.**
- `classIds` (optional CSV of UUIDs) — the classes to project. If absent/blank the service
  returns `[]`.
- `limit` (optional int, default `10`) — max number of occurrences returned after sorting.

**POST `/timetables` request JSON** (`TimetableRequest`, all fields `@NotNull`):

```json
{
  "classId": "00000000-0000-0000-0d01-000000000001",
  "teacherId": "00000000-0000-0000-0002-000000000001",
  "roomId": "00000000-0000-0000-0f01-000000000001",
  "startTime": "10:00",
  "endTime": "11:30",
  "dayOfWeek": "MONDAY"
}
```

`TimetableResponse` adds `id` and `roomName` to the above.

**POST `/timetables/generate` request JSON** (`GenerateTimetableRequest`):

```json
{
  "items": [
    {
      "classId": "…",
      "teacherId": "…",
      "preferredDayOfWeek": "MONDAY",
      "durationMinutes": 90
    }
  ]
}
```

### `/rooms`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/rooms` | Any authenticated | List all rooms. |
| GET | `/rooms/{id}` | Any authenticated | Get one room by id. `404` if missing. |
| POST | `/rooms` | PRINCIPAL | Create a room. Returns `201`. |
| PUT | `/rooms/{id}` | PRINCIPAL | Update a room's name/capacity. |
| DELETE | `/rooms/{id}` | PRINCIPAL | Delete a room. `404` if missing. Returns `204`. |
| GET | `/rooms/{roomId}/availability?date=&day=` | Any authenticated | Occupied vs free slots for the room on a given weekday (see §7). |

**POST `/rooms` request JSON** (`RoomRequest`):

```json
{ "roomName": "Studio 1", "capacity": 20 }
```

`roomName` is required (max 100 chars); `capacity` is required and must be `>= 1`.

**Room availability query params.** The handler resolves the target weekday in priority order:
`day` (a `DayOfWeek` such as `MONDAY`) if present, else the weekday of `date` (ISO date) if
present, else today's weekday. It then delegates to `getRoomAvailability(roomId, day)`.

## 7. Service Logic

### Overlap validation (create / update)
Before saving, both `createTimetable` and `updateTimetable` call `validateTeacherConflict` and
`validateRoomConflict`. Each runs a repository query (`findConflictingTeacherTimetables` /
`findConflictingRoomTimetables`) matching the same `dayOfWeek` and a half-open time overlap
(`startTime < end AND endTime > start`). On update the current row id is excluded so a row does
not conflict with itself. A non-empty result throws `409 Conflict` via `ApiException`.

### Auto-generation (`generate`)
FIFO packing from `08:00`. A running `slotStart` cursor begins at `08:00`; for each item the
slot is `[slotStart, slotStart + durationMinutes)`. The service picks the first room (of those
with `capacity >= 1`) that has no conflicting booking for that day/slot; if none, it throws
`400`. It also checks the teacher is free for that slot (else `409`). The row is saved, a
`timetable-generated` event is emitted, and `slotStart` advances to `slotEnd` for
the next item. (Note: because all items share one advancing cursor, they are packed
back-to-back on the time axis, while each item's `preferredDayOfWeek` is honoured.)

### Room availability gap computation
`getRoomAvailability(roomId, day)` loads that room's timetables for the weekday,
sorted by start time. It emits:
- `occupied[]` — one `Slot` per booking (`startTime`, `endTime`, `timetableId`, `classId`).
- `free[]` — the gaps within the working-day window **`08:00`–`20:00`** (`DAY_START`/`DAY_END`).
  A cursor sweeps from `08:00`; for each booking, any gap between the cursor and the booking
  start is a free slot, and the cursor advances to the booking end; after the last booking, any
  remainder up to `20:00` is a final free slot.

### Upcoming projection
`getUpcoming(classIds, limit)` loads the timetables for the given classes and maps
each recurring weekly slot to its **next calendar date**:
- `nextOccurrence` computes days-until-target-weekday as `(target - today + 7) % 7`.
- If that lands on **today** but the session `startTime` is not after `now`, it rolls forward a
  full week (`diff = 7`) so a session already started/passed today is shown for next week.
The results are sorted ascending by `(date, startTime)` and truncated to `limit`.

## 8. Kafka Events Published

Producer only — there is no `@KafkaListener` in this service, and there are **no active
downstream consumers** of these topics today. The producer is idempotent (`acks=all`,
`retries=3`, `enable.idempotence=true`), JSON-serialized, keyed by the timetable id.

| Topic (`KafkaTopics`) | Event class | Emitted when | Payload |
|-----------------------|-------------|--------------|---------|
| `timetable-generated` (`TIMETABLE_GENERATED`) | `TimetableGeneratedEvent` | On `POST /timetables` (create) and each row from `POST /timetables/generate` | `timetableId`, `classId`, `teacherId`, `roomId`, `dayOfWeek` (String), `startTime` (String), `endTime` (String), `occurredAt` (Instant) |
| `timetable-updated` (`TIMETABLE_UPDATED`) | `TimetableGeneratedEvent` | On `PUT /timetables/{id}` (update) | Same shape as above |

> **Implementation note / discrepancy:** although the topic constant `TIMETABLE_UPDATED`
> exists, there is **no separate `TimetableUpdatedEvent` class** in `common-library`.
> `publishTimetableUpdatedEvent` reuses `TimetableGeneratedEvent` and simply sends it to the
> `timetable-updated` topic.

## 9. Migrations

Flyway, clean-slate, two files:

| Version | File | Location | Applies |
|---------|------|----------|---------|
| V1 | `V1__init_timetable_schema.sql` | `db/migration` | Always. Creates `ROOMS`, `TIMETABLES`, the four indexes and the FK. |
| V2 | `V2__seed_dev_data.sql` | `db/seed` | **Only under the `docker` profile** (`flyway.locations` adds `classpath:db/seed`). Idempotent (`ON CONFLICT (ID) DO NOTHING`). |

Under the default profile only `db/migration` is on the Flyway path, so production/local runs
without seed data; `docker`/dev runs additionally apply the seed. `spring.jpa.hibernate.ddl-auto`
is `validate` — Hibernate never mutates the schema.

**V2 seed content:**
- Rooms: `Studio 1` (capacity 20), `Studio 2` (capacity 15).
- 4 timetables:
  - Painting class → Studio 1, teacher1, `MONDAY` and `WEDNESDAY` `10:00–11:30`.
  - Sculpture class → Studio 2, teacher2, `TUESDAY` and `THURSDAY` `14:00–15:30`.
