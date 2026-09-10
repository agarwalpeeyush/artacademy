# Scheduling Service — Detail Design Document

## 1. Overview

The `scheduling-service` manages physical rooms and the weekly timetable (Schedules) for
each class. Schedules follow a **draft → publish** lifecycle: newly created schedules default
to `DRAFT` and are only visible to teachers and students once `PUBLISHED`. Publishing snapshots
the current published timetable into an **immutable version** (schedule history). The service also
provides a **conflict dashboard** (teacher/room/class double-booking), **room availability** for a
given day, and a chronological **upcoming classes** projection that maps weekly slots onto the next
calendar dates. It publishes Kafka events when schedules are created, updated, or published.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `scheduling-service` |
| Package root | `com.artacademy.scheduling` |
| Server port | **8085** local/dev · **8085** Docker container (host-mapped `8085:8085`) |
| Database | `schedule_db` (PostgreSQL) |

---

## 3. Component Structure

```
com.artacademy.scheduling
├── SchedulingServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   └── KafkaProducerConfig.java
├── controller
│   ├── RoomController.java
│   └── ScheduleController.java
├── domain
│   ├── Room.java
│   ├── Schedule.java
│   ├── ScheduleStatus.java          (enum: DRAFT, PUBLISHED)
│   ├── ScheduleVersion.java         (history snapshot header)
│   └── ScheduleVersionEntry.java    (frozen copy of one schedule row)
├── dto
│   ├── RoomRequest.java
│   ├── RoomResponse.java
│   ├── RoomAvailabilityResponse.java
│   ├── ScheduleRequest.java
│   ├── ScheduleResponse.java
│   ├── ScheduleConflictResponse.java
│   ├── ScheduleVersionResponse.java
│   ├── UpcomingClassResponse.java
│   └── GenerateScheduleRequest.java
├── mapper
│   ├── RoomMapper.java      (MapStruct)
│   └── ScheduleMapper.java  (MapStruct)
├── repository
│   ├── RoomRepository.java
│   ├── ScheduleRepository.java
│   └── ScheduleVersionRepository.java
└── service
    ├── RoomService.java
    └── ScheduleService.java
```

---

## 4. Domain Model

### 4.1 `Room`

```
UUID     id
String   roomName     (not null)
Integer  capacity
```

### 4.2 `Schedule`

```
UUID           id
UUID           classId         (FK → course-enrollment-service)
UUID           teacherId       (FK → user-service)
Room           room            (ManyToOne → rooms)
LocalTime      startTime
LocalTime      endTime
DayOfWeek      dayOfWeek       (Java enum)
ScheduleStatus status          (DRAFT | PUBLISHED, default DRAFT)
Instant        publishedAt     (nullable; stamped on publish)
```

### 4.3 `ScheduleVersion` (history header)

```
UUID     id
int      versionNumber   (monotonic, 1-based)
Instant  publishedAt
String   publishedBy      (username from security context)
int      entryCount
List<ScheduleVersionEntry> entries   (OneToMany, cascade ALL)
```

### 4.4 `ScheduleVersionEntry` (frozen row)

A decoupled copy of one schedule at publish time (does not FK to live `SCHEDULES`):

```
UUID       id
ScheduleVersion version   (ManyToOne → schedule_versions)
UUID       scheduleId      (original id, informational)
UUID       classId
UUID       teacherId
UUID       roomId
String     roomName
DayOfWeek  dayOfWeek
LocalTime  startTime
LocalTime  endTime
```

---

## 5. Database Schema

Final state after V3 migration:

```sql
CREATE TABLE ROOMS (
    ID        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ROOM_NAME VARCHAR(100) NOT NULL,
    CAPACITY  INTEGER
);

CREATE TABLE SCHEDULES (
    ID           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    CLASS_ID     UUID NOT NULL,
    TEACHER_ID   UUID NOT NULL,
    ROOM_ID      UUID NOT NULL REFERENCES ROOMS(ID),
    START_TIME   TIME NOT NULL,
    END_TIME     TIME NOT NULL,
    DAY_OF_WEEK  VARCHAR(10) NOT NULL,
    STATUS       VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    PUBLISHED_AT TIMESTAMP NULL
);
CREATE INDEX IDX_SCHEDULES_CLASS   ON SCHEDULES(CLASS_ID);
CREATE INDEX IDX_SCHEDULES_TEACHER ON SCHEDULES(TEACHER_ID);

CREATE TABLE SCHEDULE_VERSIONS (
    ID             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    VERSION_NUMBER INTEGER NOT NULL,
    PUBLISHED_AT   TIMESTAMP NOT NULL,
    PUBLISHED_BY   VARCHAR(200),
    ENTRY_COUNT    INTEGER NOT NULL
);
CREATE INDEX IDX_SCHEDULE_VERSIONS_NUMBER ON SCHEDULE_VERSIONS(VERSION_NUMBER);

CREATE TABLE SCHEDULE_VERSION_ENTRIES (
    ID          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    VERSION_ID  UUID NOT NULL REFERENCES SCHEDULE_VERSIONS(ID),
    SCHEDULE_ID UUID,
    CLASS_ID    UUID NOT NULL,
    TEACHER_ID  UUID NOT NULL,
    ROOM_ID     UUID NOT NULL,
    ROOM_NAME   VARCHAR(100),
    DAY_OF_WEEK VARCHAR(10) NOT NULL,
    START_TIME  TIME NOT NULL,
    END_TIME    TIME NOT NULL
);
```

`ddl-auto: validate` — the schema above must match the JPA entities exactly.

---

## 6. REST API

### 6.1 Room Endpoints

Base path: `/rooms`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/rooms` | Any | List all rooms |
| `GET` | `/rooms/{id}` | Any | Get room by UUID |
| `POST` | `/rooms` | PRINCIPAL | Create room |
| `PUT` | `/rooms/{id}` | PRINCIPAL | Update room |
| `DELETE` | `/rooms/{id}` | PRINCIPAL | Delete room |
| `GET` | `/rooms/{roomId}/availability` | Any | Occupied vs free slots for a day |

#### `GET /rooms/{roomId}/availability?date=2026-09-14` (or `?day=MONDAY`)

The controller resolves the day-of-week as: explicit `day` param if present, else
`date.getDayOfWeek()` if a `date` is passed, else today. Returns
`RoomAvailabilityResponse` — the room, the resolved `dayOfWeek`, the list of `occupied`
slots (each `{ startTime, endTime, scheduleId, classId }`) sorted by start, and the derived
`free` gaps between them within the working-day window **08:00–20:00**.

---

### 6.2 Schedule Endpoints

Base path: `/schedules`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/schedules` | Any | List **all** schedules (DRAFT + PUBLISHED) — Principal timetable |
| `GET` | `/schedules/{id}` | Any | Get schedule by UUID |
| `POST` | `/schedules` | PRINCIPAL | Create single schedule (created as `DRAFT`) |
| `POST` | `/schedules/generate` | PRINCIPAL | Bulk-generate schedules |
| `PUT` | `/schedules/{id}` | PRINCIPAL | Update schedule |
| `DELETE` | `/schedules/{id}` | PRINCIPAL | Delete schedule |
| `POST` | `/schedules/publish` | PRINCIPAL | Publish all drafts; returns the new `ScheduleVersionResponse` |
| `POST` | `/schedules/{id}/publish` | PRINCIPAL | Publish a single schedule |
| `POST` | `/schedules/{id}/unpublish` | PRINCIPAL | Revert a single schedule to `DRAFT` |
| `GET` | `/schedules/history` | PRINCIPAL | List published versions (newest first) |
| `GET` | `/schedules/history/{versionId}` | PRINCIPAL | Version detail with frozen entries |
| `GET` | `/schedules/conflicts` | PRINCIPAL | Detected teacher/room/class conflicts |
| `GET` | `/schedules/upcoming?classIds=&limit=10` | Any | Next N sessions as calendar dates |
| `GET` | `/schedules/teacher/{teacherId}` | Any | Teacher's **PUBLISHED** weekly schedule |
| `GET` | `/schedules/student/{studentId}?classIds=` | Any | Student's **PUBLISHED** schedule across classes |

**Visibility rule:** `GET /schedules` returns everything (Principal view). The teacher and
student endpoints return **PUBLISHED only**. `classIds` is a comma-separated UUID list parsed
by a private `parseClassIds` helper.

#### `POST /schedules` — Request Body

```json
{
  "classId": "<UUID>",
  "teacherId": "<UUID>",
  "roomId": "<UUID>",
  "startTime": "09:00",
  "endTime": "11:00",
  "dayOfWeek": "MONDAY"
}
```

The new row is persisted with `status = DRAFT`. Conflict validation runs on create/update:
no existing schedule for the same `teacherId` **or** `roomId` may overlap
`(dayOfWeek, startTime, endTime)` — otherwise a conflict error is thrown.

#### `GET /schedules/upcoming?classIds=<uuid>,<uuid>&limit=10`

For each PUBLISHED schedule in the given classes, computes the **next calendar occurrence**
whose weekday equals `dayOfWeek` (today included if the start time has not yet passed), sorts
ascending, and returns up to `limit` `UpcomingClassResponse` rows
(`{ scheduleId, date, dayOfWeek, startTime, endTime, classId, teacherId, roomId, roomName }`).

---

## 7. Service Logic

### `RoomService`

Standard CRUD plus `getAvailability(roomId, day)` which loads that room's schedules for the
day, sorts by start time, and computes free gaps within **08:00–20:00**.

### `ScheduleService`

| Method | Logic |
|--------|-------|
| `createSchedule(request)` | Validate teacher/room conflict; save as `DRAFT`; publish `ScheduleGeneratedEvent` |
| `generateSchedules(request)` | For each item: find a free slot; create; publish event; collect errors |
| `updateSchedule(id, request)` | Load; re-validate conflicts excluding self; save; publish `ScheduleUpdatedEvent` |
| `publishAll()` | Flip all `DRAFT` → `PUBLISHED`, stamp `publishedAt`, then `snapshotCurrentTimetable()` into a new `ScheduleVersion`; returns the version |
| `publish(id)` / `unpublish(id)` | Toggle a single schedule's status |
| `getByTeacher(teacherId)` | PUBLISHED-only rows for the teacher |
| `getByStudent(classIds)` | PUBLISHED-only rows whose `classId IN classIds` |
| `getConflicts()` | Load all schedules; group by day; pairwise-detect overlaps sharing teacher/room/class (O(n²) per day) |
| `getRoomAvailability(roomId, day)` | Occupied slots + derived free gaps in the working-day window |
| `getUpcoming(classIds, limit)` | Project weekly slots onto the next calendar dates and sort |

**Overlap predicate:** `aStart < bEnd && bStart < aEnd` on the same `dayOfWeek`, classified by
which key matches — `TEACHER_DOUBLE_BOOKED`, `ROOM_DOUBLE_BOOKED`, or `CLASS_OVERLAP`.

**Next-occurrence math:** `daysAhead = (targetDow - todayDow + 7) % 7`; if `daysAhead == 0` and
today's start time has already passed, advance by 7 days.

**Snapshot on publish:** `publishAll()` reads the current PUBLISHED set, computes the next
`versionNumber` (max existing + 1), and writes a `ScheduleVersion` with one frozen
`ScheduleVersionEntry` per row. History versions are never mutated afterward.

---

## 8. Kafka Events Published

| Topic | Event | When |
|-------|-------|------|
| `schedule.generated` | `ScheduleGeneratedEvent` | After single create or bulk generation |
| `schedule.updated` | `ScheduleGeneratedEvent` (reused) | After update and after publish |

**`ScheduleGeneratedEvent` payload:**
```
scheduleId  : UUID
classId     : UUID
teacherId   : UUID
roomId      : UUID
dayOfWeek   : String
startTime   : String
endTime     : String
occurredAt  : Instant
```

---

## 9. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGSERIAL IDs and BIGINT FKs |
| V2 | Migrated to UUID primary keys; added indexes on classId and teacherId |
| V3 | Added `STATUS` + `PUBLISHED_AT` to `SCHEDULES`; created `SCHEDULE_VERSIONS` and `SCHEDULE_VERSION_ENTRIES` (draft/publish workflow + snapshot history) |
| V4 | Seed sample data: 2 rooms (Studio 1, Studio 2) and 4 PUBLISHED weekly schedules (Painting Mon/Wed 09:00–11:00, Sculpture Tue/Thu 15:00–17:00) |
