# attendance-service — Design

Records student and teacher attendance and tracks corrections. Attendance is keyed to `(subject, timetableId, date)` — the old `CLASS_SESSION`/`classId` model was dropped at V3. `StudentAttendance` also carries editable `startTime`/`endTime` (added V4). Port 8084, database `attendance_db`. Spring Boot 3.3.4 / Java 21, PostgreSQL (Flyway validate), Kafka, JWT via common-library. Responses wrapped in `ApiResponse<T> {success, message, data}`.

## Endpoints

### StudentAttendanceController (ApiResponse)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/attendance/students` | Mark / upsert |
| POST | `/attendance/students/bulk` | |
| POST | `/attendance/students/timetable/{timetableId}/bulk-range` | Mark roster across a set of session dates |
| PUT | `/attendance/students/{id}` | |
| GET | `/attendance/students/{studentId}` | Optional from/to |
| GET | `/attendance/students/{studentId}/stats` | Optional courseId; half-day = 0.5 |
| GET | `/attendance/students/timetable/{timetableId}/date` | |

### TeacherAttendanceController (ApiResponse)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/attendance/teachers` | |
| POST | `/attendance/teachers/timetable/{timetableId}/bulk-range` | |
| GET | `/attendance/teachers/{teacherId}` | Optional from/to |
| GET | `/attendance/teachers/timetable/{timetableId}/date` | |

### AttendanceCorrectionController (ApiResponse) — DIRECT EDIT + audit, NO approval workflow
| Method | Path | Access |
|--------|------|--------|
| POST | `/attendance/corrections/students` | teacher/principal |
| POST | `/attendance/corrections/teachers` | principal |
| GET | `/attendance/corrections/attendance/{attendanceId}` | |
| GET | `/attendance/corrections/subject/{subjectId}` | |

## Entities

| Entity | Key fields |
|--------|-----------|
| StudentAttendance | studentId, courseId, timetableId, attendanceDate, status (enum PRESENT/ABSENT/LEAVE/HALF_DAY), startTime, endTime, remarks; unique (studentId + timetableId + attendanceDate) |
| TeacherAttendance | teacherId, courseId, timetableId, attendanceDate, status, remarks; unique (teacherId + timetableId + attendanceDate) |
| AttendanceCorrection | attendanceType, attendanceId, subjectId, attendanceDate, oldStatus, newStatus, reason, editedByUserId, editorRole, editedAt |

## Migrations

| Version | Description |
|---------|-------------|
| V1 | initial (old class-session model) |
| V2 | seed — docker only |
| V3 | DROP CLASS_SESSION, re-key attendance to timetable_id, course_id NOT NULL |
| V4 | add START_TIME/END_TIME to STUDENT_ATTENDANCE (nullable) |

Latest: V4.

## Kafka

- **Produces:** `attendance-recorded`, `attendance-updated`.
- **Consumes:** none.
