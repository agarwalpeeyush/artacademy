# Course Enrollment Service — Testing Guide

This guide covers manual/API testing of the Course Enrollment Service.

## Prerequisites

- Base URL: via the API Gateway at `http://localhost:8080` (routes to this service), or
  directly at `http://localhost:8083`.
- A valid JWT bearer token. For seeded local/docker environments, log in as the seeded
  principal with password `Admin@1234`, then send `Authorization: Bearer <token>` on
  every request.
- Roles matter: course/class mutations require **PRINCIPAL**; enrollment mutations require
  **PRINCIPAL or TEACHER**; all reads require any authenticated user.
- Seeded data (docker/dev profile): courses `PAINT-101` (Painting, cap-20 class "Painting
  - Batch A") and `SCULP-101` (Sculpture, cap-15 class "Sculpture - Batch A"); 5 active
  enrollments across students 1–4.

Seeded UUIDs used in examples below:

| Entity            | UUID                                     |
|-------------------|------------------------------------------|
| Course PAINT-101  | `00000000-0000-0000-0c01-000000000001`   |
| Course SCULP-101  | `00000000-0000-0000-0c02-000000000001`   |
| Class Painting A  | `00000000-0000-0000-0d01-000000000001`   |
| Class Sculpture A | `00000000-0000-0000-0d02-000000000001`   |
| Student 1         | `00000000-0000-0000-0003-000000000001`   |
| Teacher 1         | `00000000-0000-0000-0002-000000000001`   |

All responses are wrapped in the `ApiResponse<T>` envelope.

## API Test Scenarios

| # | Scenario | Request | Auth | Expected |
|---|----------|---------|------|----------|
| 1 | List courses | `GET /courses` | Authenticated | 200; seeded courses returned |
| 2 | Filter courses by type | `GET /courses?type=ART` | Authenticated | 200; PAINT-101 + SCULP-101 |
| 3 | Get course by id | `GET /courses/{id}` | Authenticated | 200 (404 for unknown id) |
| 4 | Create course | `POST /courses` (valid body) | PRINCIPAL | 201; body echoed with id |
| 5 | Create duplicate course code | `POST /courses` reusing `PAINT-101` | PRINCIPAL | 409 Conflict |
| 6 | Create course as non-principal | `POST /courses` | TEACHER/STUDENT | 403 Forbidden |
| 7 | Update course | `PUT /courses/{id}` | PRINCIPAL | 200; updated fields |
| 8 | Delete course | `DELETE /courses/{id}` | PRINCIPAL | 200 |
| 9 | List classes | `GET /classes` | Authenticated | 200; seeded classes |
| 10 | Get class by id | `GET /classes/{id}` | Authenticated | 200 (404 for unknown) |
| 11 | List classes by teacher | `GET /classes/teacher/{teacherId}` | Authenticated | 200; teacher's classes |
| 12 | Create class | `POST /classes` (valid body) | PRINCIPAL | 201 |
| 13 | Create class with capacity ≤ 0 | `POST /classes` `capacity=0` | PRINCIPAL | 400 Bad Request |
| 14 | Update class | `PUT /classes/{id}` | PRINCIPAL | 200 |
| 15 | Shrink capacity below active count | `PUT /classes/{id}` capacity < enrolled | PRINCIPAL | 400 Bad Request |
| 16 | Delete class with active enrollments | `DELETE /classes/{seeded class id}` | PRINCIPAL | 409 Conflict |
| 17 | Enroll student (success) | `POST /enrollments` (new student+course) | PRINCIPAL/TEACHER | 201; status `ACTIVE` |
| 18 | Enroll — capacity exceeded | `POST /enrollments` into a full class | PRINCIPAL/TEACHER | 400 Bad Request |
| 19 | Enroll — duplicate active | `POST /enrollments` student1 → PAINT-101 again | PRINCIPAL/TEACHER | 409 Conflict |
| 20 | Enroll — class not found | `POST /enrollments` unknown `classId` | PRINCIPAL/TEACHER | 404 Not Found |
| 21 | Enroll — omit enrollmentDate | `POST /enrollments` without `enrollmentDate` | PRINCIPAL/TEACHER | 201; date defaults to today |
| 22 | List all enrollments | `GET /enrollments` | Authenticated | 200 |
| 23 | List by student | `GET /enrollments/student/{studentId}` | Authenticated | 200; student1 has 2 |
| 24 | List by course | `GET /enrollments/course/{courseId}` | Authenticated | 200 |
| 25 | List by class | `GET /enrollments/class/{classId}` | Authenticated | 200 |
| 26 | Soft-cancel enrollment | `DELETE /enrollments/{id}` | PRINCIPAL/TEACHER | 200; row retained, status `CANCELLED` |
| 27 | Cancel already-cancelled | `DELETE /enrollments/{cancelled id}` | PRINCIPAL/TEACHER | 409 Conflict |
| 28 | Change status (valid) | `PUT /enrollments/{id}/status` `{"status":"COMPLETED"}` | PRINCIPAL/TEACHER | 200; status updated |
| 29 | Change status (invalid) | `PUT /enrollments/{id}/status` `{"status":"FOO"}` | PRINCIPAL/TEACHER | 400 Bad Request |
| 30 | Any call without token | any endpoint, no `Authorization` | — | 401 Unauthorized |

## Sample Requests

**Create course (ACD-003)**

```bash
curl -X POST http://localhost:8083/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseCode": "GUITAR-101",
    "courseName": "Guitar Basics",
    "courseType": "MUSIC",
    "description": "Intro to guitar",
    "monthlyFee": 2000.00,
    "admissionFee": 800.00,
    "durationMonths": 6,
    "status": "ACTIVE"
  }'
```

**Enroll a student (ACD-012)**

```bash
curl -X POST http://localhost:8083/enrollments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "00000000-0000-0000-0003-000000000002",
    "courseId": "00000000-0000-0000-0c02-000000000001",
    "classId": "00000000-0000-0000-0d02-000000000001"
  }'
```

**Duplicate-active rejection (ACD-013)** — re-enrolling seeded student1 into PAINT-101:

```bash
curl -X POST http://localhost:8083/enrollments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "00000000-0000-0000-0003-000000000001",
    "courseId": "00000000-0000-0000-0c01-000000000001",
    "classId": "00000000-0000-0000-0d01-000000000001"
  }'
# → 409 Conflict: student is already actively enrolled in this course
```

**Soft-cancel (ACD-017)**

```bash
curl -X DELETE http://localhost:8083/enrollments/{enrollmentId} \
  -H "Authorization: Bearer $TOKEN"
# → 200; the enrollment row remains with STATUS='CANCELLED'
```

**Change status (ACD-018)**

```bash
curl -X PUT http://localhost:8083/enrollments/{enrollmentId}/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
```

## Kafka Verification

- After an enrollment (scenario 17/21), verify an `enrollment-created` message on the
  `enrollment-created` topic with `enrollmentId`, `studentId`, `courseId`, `classId`,
  `occurredAt`.
- After a soft-cancel (scenario 26), verify an `enrollment-cancelled` message on the
  `enrollment-cancelled` topic with `enrollmentId`, `studentId`, `courseId`, `occurredAt`.
- Note: a status change via `PUT /{id}/status` emits **no** event.
- Downstream, `payment-service` should reflect the enrollment in its `ENROLLMENT_CACHE`
  and `reporting-service` should update its aggregates.
