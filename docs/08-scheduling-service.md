# Scheduling Service — Detail Design Document

## 1. Overview

The `scheduling-service` manages physical rooms and the weekly timetable (Schedules) for each class. It supports both manual schedule creation and bulk schedule generation with automatic room and time-slot assignment. It enforces conflict rules (no teacher or room double-booked at the same time on the same day) and publishes events when schedules are created or updated.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `scheduling-service` |
| Package root | `com.artacademy.scheduling` |
| Server port | **8085** (registered in Eureka as `SCHEDULING-SERVICE`) |
| Database | `artacademy_scheduling` (PostgreSQL) |

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
│   └── Schedule.java
├── dto
│   ├── RoomRequest.java
│   ├── RoomResponse.java
│   ├── ScheduleRequest.java
│   ├── ScheduleResponse.java
│   └── GenerateScheduleRequest.java
├── mapper
│   ├── RoomMapper.java      (MapStruct)
│   └── ScheduleMapper.java  (MapStruct)
├── repository
│   ├── RoomRepository.java
│   └── ScheduleRepository.java
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
UUID       id
UUID       classId         (FK → course-enrollment-service)
UUID       teacherId       (FK → user-service)
Room       room            (ManyToOne → rooms)
LocalTime  startTime
LocalTime  endTime
DayOfWeek  dayOfWeek       (Java enum)
```

---

## 5. Database Schema

Final state after V2 migration:

```sql
CREATE TABLE rooms (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name VARCHAR(100) NOT NULL,
    capacity  INTEGER
);

CREATE TABLE schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    UUID NOT NULL,
    teacher_id  UUID NOT NULL,
    room_id     UUID NOT NULL REFERENCES rooms(id),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    day_of_week VARCHAR(10) NOT NULL
);
CREATE INDEX idx_schedules_class   ON schedules(class_id);
CREATE INDEX idx_schedules_teacher ON schedules(teacher_id);
```

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

#### `POST /rooms` — Request Body

```json
{
  "roomName": "Studio A",
  "capacity": 15
}
```

---

### 6.2 Schedule Endpoints

Base path: `/schedules`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/schedules` | Any | List all schedules |
| `GET` | `/schedules/{id}` | Any | Get schedule by UUID |
| `GET` | `/schedules/teacher/{teacherId}` | Any | Get schedules for a teacher |
| `GET` | `/schedules/student` | Any | Get schedules for a student's class IDs |
| `POST` | `/schedules` | PRINCIPAL | Create single schedule |
| `POST` | `/schedules/generate` | PRINCIPAL | Bulk-generate schedules |
| `PUT` | `/schedules/{id}` | PRINCIPAL | Update schedule |
| `DELETE` | `/schedules/{id}` | PRINCIPAL | Delete schedule |

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

**Conflict validation:**
- No existing schedule for the same `teacherId` overlaps `(dayOfWeek, startTime, endTime)`.
- No existing schedule for the same `roomId` overlaps `(dayOfWeek, startTime, endTime)`.
- Throw `409 Conflict` if either constraint is violated.

#### `GET /schedules/student?classIds=<uuid>,<uuid>,...`

Returns all schedules whose `classId` is in the provided comma-separated list (used by the frontend to show a student's weekly timetable).

#### `POST /schedules/generate` — Bulk Generation

```json
{
  "items": [
    {
      "classId": "<UUID>",
      "teacherId": "<UUID>",
      "preferredDayOfWeek": "TUESDAY",
      "durationMinutes": 120
    }
  ]
}
```

**Generation algorithm:**

For each item:
1. If `preferredDayOfWeek` is provided, try it first; otherwise iterate all days.
2. Try each standard start time slot (e.g. 09:00, 11:00, 14:00, 16:00).
3. Check teacher conflict and room availability for the calculated `[startTime, startTime + durationMinutes]`.
4. If a free slot is found, create the schedule and publish `ScheduleGeneratedEvent`.
5. If no slot is found, add to error list and continue.

---

## 7. Service Logic

### `RoomService`

Standard CRUD with transactional methods. No additional business rules.

### `ScheduleService`

| Method | Logic |
|--------|-------|
| `createSchedule(request)` | Validate teacher conflict; validate room conflict; save; publish `ScheduleGeneratedEvent` |
| `generateSchedules(request)` | For each `ScheduleItem`: find free slot; create schedule; publish event; collect errors |
| `updateSchedule(id, request)` | Load; re-validate conflicts excluding self; save; publish `ScheduleUpdatedEvent` |
| `getByTeacherId(teacherId)` | Query `schedules` by `teacherId` |
| `getByClassIds(classIds)` | Query `schedules` where `classId IN classIds` |

**Conflict detection predicate:**

```
(existingDayOfWeek = newDayOfWeek)
AND (existingStartTime < newEndTime)
AND (existingEndTime > newStartTime)
AND (existingTeacherId = newTeacherId)   -- OR existingRoomId = newRoomId
```

---

## 8. Kafka Events Published

| Topic | Event | When |
|-------|-------|------|
| `schedule.generated` | `ScheduleGeneratedEvent` | After single create or bulk generation |
| `schedule.updated` | `ScheduleGeneratedEvent` (reused) | After update |

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
