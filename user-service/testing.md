# User Service — Testing Guide

This guide covers manual/API testing of the User Service. Requests go through the
API gateway at `http://localhost:8080` (recommended, exercises JWT propagation) or
directly at `http://localhost:8082`. All examples below use `{BASE}` for whichever
you choose.

## Prerequisites

- The platform is running (Postgres `user_db`, Kafka, config-server, eureka, gateway).
- The service was started with the `docker` (or dev) profile so the seed data from
  `V2__seed_dev_data.sql` is loaded.
- You have a JWT. Obtain one from the auth-service login endpoint. Seeded accounts use
  password **`Admin@1234`** (login IDs `teacher1`, `teacher2`, `student1`..`student4`,
  `parent1`, plus a PRINCIPAL/admin account). Pass it as
  `Authorization: Bearer <token>` on every request.
- All mutating calls (POST/PUT/DELETE) require a **PRINCIPAL** token.
- Responses are wrapped in the common `ApiResponse` envelope (`success`, `data`,
  `message`).

Seeded IDs for reference:

- teacher1 (Aisha Khan, EMP-001) = `00000000-0000-0000-0002-000000000001`
- student1 (Meera Nair) = `00000000-0000-0000-0003-000000000001`
- parent1 (Sunita Nair, → student1) = `00000000-0000-0000-0004-000000000001`

## API Test Scenarios

### Students

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| S1 | Create a student | `POST {BASE}/students` | PRINCIPAL | 201, body has new UUID; `student-created` event published |
| S2 | Create with duplicate loginId | `POST {BASE}/students` | PRINCIPAL | 409 conflict |
| S3 | List students | `GET {BASE}/students?page=0&size=20` | any read role | 200, paged list |
| S4 | Get student by ID | `GET {BASE}/students/{id}` | any read role | 200, profile |
| S5 | Get unknown student | `GET {BASE}/students/{randomUuid}` | any read role | 404 not found |
| S6 | Update a student | `PUT {BASE}/students/{id}` | PRINCIPAL | 200, updated profile |
| S7 | Delete a student | `DELETE {BASE}/students/{id}` | PRINCIPAL | 200 |
| S8 | Student views own profile | `GET {BASE}/students/me` | STUDENT (`student1`) | 200, own profile |

Sample S1 body:

```json
{
  "loginId": "student5", "firstName": "Ishaan", "lastName": "Mehta",
  "dob": "2011-03-14", "email": "student5@artacademy.test",
  "enrollmentDate": "2025-08-01", "status": "ACTIVE"
}
```

### Teachers

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| T1 | Create a teacher | `POST {BASE}/teachers` | PRINCIPAL | 201, new UUID; `teacher-created` event |
| T2 | Create with duplicate employee code | `POST {BASE}/teachers` | PRINCIPAL | 409 conflict |
| T3 | List teachers | `GET {BASE}/teachers?page=0&size=20` | PRINCIPAL/TEACHER/STUDENT | 200, paged list |
| T4 | Get teacher by ID | `GET {BASE}/teachers/{id}` | PRINCIPAL/TEACHER/STUDENT | 200 |
| T5 | Update a teacher | `PUT {BASE}/teachers/{id}` | PRINCIPAL | 200 |
| T6 | Delete a teacher | `DELETE {BASE}/teachers/{id}` | PRINCIPAL | 200, availability + exceptions removed too |
| T7 | Teacher views own profile | `GET {BASE}/teachers/me` | TEACHER (`teacher1`) | 200 |

Sample T1 body:

```json
{
  "loginId": "teacher3", "firstName": "Neha", "lastName": "Iyer",
  "employeeCode": "EMP-003", "email": "teacher3@artacademy.test",
  "joiningDate": "2025-02-01", "status": "ACTIVE"
}
```

### Parents

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| P1 | Create a parent linked to a student | `POST {BASE}/parents` | PRINCIPAL | 201, `parent-created` event (first login) |
| P2 | Add another child to same parent login | `POST {BASE}/parents` (same loginId, diff studentId) | PRINCIPAL | 201, new row, **no** new auth event |
| P3 | Create parent with unknown studentId | `POST {BASE}/parents` | PRINCIPAL | 404 not found |
| P4 | List / get parents | `GET {BASE}/parents`, `GET {BASE}/parents/{id}` | any read role | 200; `studentName` enriched |
| P5 | Update / delete parent | `PUT`/`DELETE {BASE}/parents/{id}` | PRINCIPAL | 200 |
| P6 | Parent views own profile | `GET {BASE}/parents/me` | PARENT (`parent1`) | 200 |
| P7 | Parent lists children | `GET {BASE}/parents/me/children` | PARENT (`parent1`) | 200, one entry (Meera Nair) |

### Teacher Availability

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| A1 | Get availability | `GET {BASE}/teachers/{id}/availability` | PRINCIPAL/TEACHER/STUDENT | 200, slot list (possibly empty) |
| A2 | Set/replace availability | `PUT {BASE}/teachers/{id}/availability` | PRINCIPAL | 200, returns saved slots; old slots replaced |
| A3 | Get after replace | `GET {BASE}/teachers/{id}/availability` | read role | 200, matches last PUT |

Sample A2 body:

```json
[
  { "dayOfWeek": "MONDAY",    "startTime": "09:00", "endTime": "12:00" },
  { "dayOfWeek": "WEDNESDAY", "startTime": "10:00", "endTime": "13:00" }
]
```

### Teacher Availability Exceptions

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| E1 | Add all-day exception | `POST {BASE}/teachers/{id}/availability-exceptions` | PRINCIPAL | 201; startTime/endTime stored null |
| E2 | Add partial-day exception | `POST {BASE}/teachers/{id}/availability-exceptions` | PRINCIPAL | 201; times retained |
| E3 | List exceptions | `GET {BASE}/teachers/{id}/availability-exceptions` | read role | 200, newest first |
| E4 | Delete exception | `DELETE {BASE}/teachers/{id}/availability-exceptions/{exceptionId}` | PRINCIPAL | 200 |
| E5 | Delete exception with wrong teacherId | `DELETE {BASE}/teachers/{otherId}/availability-exceptions/{exceptionId}` | PRINCIPAL | 404 not found |

Sample E1 body:

```json
{ "date": "2026-09-21", "reason": "Sick leave", "unavailableAllDay": true }
```

Sample E2 body:

```json
{
  "date": "2026-09-22", "reason": "Doctor appointment",
  "unavailableAllDay": false, "startTime": "13:00", "endTime": "15:00"
}
```

### Login-ID Availability

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| L1 | Check free login ID | `GET {BASE}/users/login-id/available?loginId=newuser` | PRINCIPAL | 200, `{"available": true}` |
| L2 | Check taken login ID | `GET {BASE}/users/login-id/available?loginId=teacher1` | PRINCIPAL | 200, `{"available": false}` |
| L3 | Non-PRINCIPAL caller | `GET {BASE}/users/login-id/available?loginId=x` | STUDENT/TEACHER/PARENT | 403 forbidden |

## Notes

- **Authorization matrix**: mutations (POST/PUT/DELETE) on `/students`, `/teachers`,
  `/parents` and the login-id check are PRINCIPAL-only. Reads on `/teachers` allow
  PRINCIPAL/TEACHER/STUDENT; reads on `/students` and `/parents` additionally allow
  PARENT. A request with an insufficient role returns **403**; a missing/invalid token
  returns **401**.
- **Kafka verification**: after S1/T1/P1, subscribe to topics `student-created`,
  `teacher-created`, `parent-created` (e.g. `kafka-console-consumer`) to confirm the
  event fired with the new UUID and role list. P2 (second child on the same login)
  should produce **no** new event.
- **Pagination**: list endpoints accept `page`, `size` (default size 20), `sort`.
- **Idempotent seed**: re-running the service does not duplicate seed rows
  (`ON CONFLICT (ID) DO NOTHING`).
