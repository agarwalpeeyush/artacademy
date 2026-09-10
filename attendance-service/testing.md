# Attendance Service — Testing Guide

This guide covers manual/API testing of the Attendance Service. Requests can go
through the API gateway at `http://localhost:8080` (recommended, JWT enforced
end-to-end) or directly to the service at `http://localhost:8084`. Examples use
the gateway.

## Prerequisites

- Postgres `attendance_db`, Kafka, config-server, and the service are running
  (e.g. via `docker/docker-compose.yml`).
- The dev seed (`V2__seed_dev_data.sql`) is applied under the docker/dev profile,
  providing: 2 class sessions, 4 student-attendance rows, and 2 teacher-attendance
  rows on 2026-09-07 / 2026-09-08.
- Obtain a JWT by logging in through the auth service with the seeded admin
  account (password `Admin@1234`). Use a PRINCIPAL token for review actions and a
  TEACHER or PRINCIPAL token for marking.

Set a token for convenience:

```bash
TOKEN="Bearer <jwt>"
BASE="http://localhost:8080"   # or http://localhost:8084 for direct
```

Seeded IDs referenced below:

- Class A: `00000000-0000-0000-0d01-000000000001`, course `00000000-0000-0000-0c01-000000000001`
- Student S1: `00000000-0000-0000-0003-000000000001`
- Student S2 (seeded ABSENT on 2026-09-07): `00000000-0000-0000-0003-000000000002`
- Seeded ABSENT record id: `00000000-0000-0000-1202-000000000002`
- Teacher T1: `00000000-0000-0000-0002-000000000001`
- Principal P1: `00000000-0000-0000-0001-000000000001`

## API Scenarios

| # | Scenario | Request | Expected result |
|---|----------|---------|-----------------|
| 1 | Mark present | `POST /attendance/students` with status `PRESENT` for a new `(student, class, date)` | 201; record returned with a `sessionId`; `attendance-recorded` published |
| 2 | Mark absent | `POST /attendance/students` with status `ABSENT` for another new `(student, class, date)` | 201; record returned with status `ABSENT`; `attendance-recorded` published |
| 3 | Bulk mark | `POST /attendance/students/bulk` with an array covering a whole class for a date | 200; list returned; new rows `attendance-recorded`, existing rows updated + `attendance-updated` |
| 4 | Duplicate rejected | Re-`POST /attendance/students` (single) for the same `(student, class, date)` as scenario 1 | 409 conflict "Attendance already recorded" |
| 5 | Stats percentage | `GET /attendance/students/{studentId}/stats` | 200; `attendancePercentage` = round((present + 0.5*half)/total *1000)/10; empty history = 0.0 |
| 6 | Class roster by date | `GET /attendance/students/class/{classId}/date?date=2026-09-07` | 200; list of that day's records for the class |
| 7 | Teacher self-attendance | `POST /attendance/teachers` for `(teacher, date)`; repeat with a different status | 201 each; second call upserts the same row; `attendance-recorded` published |
| 8 | Submit correction | `POST /attendance/corrections` targeting the seeded ABSENT record, requesting `PRESENT` | 201; correction returned with status `PENDING` |
| 9 | Principal approve | `PATCH /attendance/corrections/{id}/approve` as PRINCIPAL | 200; correction `APPROVED`; underlying record now `PRESENT`; `attendance-updated` published |
| 10 | Principal reject | `PATCH /attendance/corrections/{id}/reject` as PRINCIPAL (fresh PENDING correction) | 200; correction `REJECTED`; underlying record unchanged; no event |
| 11 | Approve non-pending | Approve/reject a correction that is already `APPROVED`/`REJECTED` | 409 conflict "already ..." |
| 12 | Role enforcement | Approve a correction with a TEACHER token | 403 forbidden (review is PRINCIPAL-only) |

## Example Requests

Mark one student present (scenario 1):

```bash
curl -X POST "$BASE/attendance/students" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "studentId": "00000000-0000-0000-0003-000000000001",
    "classId": "00000000-0000-0000-0d01-000000000001",
    "courseId": "00000000-0000-0000-0c01-000000000001",
    "attendanceDate": "2026-09-09",
    "status": "PRESENT"
  }'
```

Bulk mark a class (scenario 3):

```bash
curl -X POST "$BASE/attendance/students/bulk" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '[
    {"studentId":"00000000-0000-0000-0003-000000000001","classId":"00000000-0000-0000-0d01-000000000001","attendanceDate":"2026-09-10","status":"PRESENT"},
    {"studentId":"00000000-0000-0000-0003-000000000002","classId":"00000000-0000-0000-0d01-000000000001","attendanceDate":"2026-09-10","status":"ABSENT","remarks":"Sick"}
  ]'
```

Get stats (scenario 5):

```bash
curl "$BASE/attendance/students/00000000-0000-0000-0003-000000000001/stats" \
  -H "Authorization: $TOKEN"
```

Teacher self-attendance (scenario 7):

```bash
curl -X POST "$BASE/attendance/teachers" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "teacherId": "00000000-0000-0000-0002-000000000001",
    "attendanceDate": "2026-09-09",
    "status": "PRESENT"
  }'
```

Submit a correction (scenario 8):

```bash
curl -X POST "$BASE/attendance/corrections" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "studentAttendanceId": "00000000-0000-0000-1202-000000000002",
    "requestedStatus": "PRESENT",
    "reason": "Marked absent in error",
    "requestedByTeacherId": "00000000-0000-0000-0002-000000000001"
  }'
```

Approve a correction as Principal (scenario 9):

```bash
curl -X PATCH "$BASE/attendance/corrections/<correctionId>/approve" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "reviewedByPrincipalId": "00000000-0000-0000-0001-000000000001",
    "reviewNote": "Verified against sign-in sheet"
  }'
```

Reject a correction as Principal (scenario 10):

```bash
curl -X PATCH "$BASE/attendance/corrections/<correctionId>/reject" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "reviewedByPrincipalId": "00000000-0000-0000-0001-000000000001",
    "reviewNote": "No supporting evidence"
  }'
```

## Verifying Kafka Events

After scenarios 1, 3, 7, and 9, confirm the corresponding events landed on the
`attendance-recorded` / `attendance-updated` topics (e.g. with
`kafka-console-consumer`). The message key is the subject id (student or teacher)
as a string. After scenario 9 (approve), re-read the underlying record via
`GET /attendance/students/{studentId}` and confirm its status changed to the
requested value; after scenario 10 (reject), confirm the record is unchanged.
