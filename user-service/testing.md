# User Service — Testing Guide

This guide covers manual/API testing of the User Service. Requests go through the
API gateway at `http://localhost:8080` (recommended, exercises JWT propagation) or
directly at `http://localhost:8082`. All examples below use `{BASE}` for whichever
you choose.

## Prerequisites

- The platform is running (Postgres `user_db`, Kafka, config-server, eureka, gateway).
- The service was started with the `docker` (or dev) profile so the seed data from
  `V2__seed_dev_data.sql` is loaded. Note that the V2 seed only inserts people rows;
  the auth **roles** are seeded in the V1 auth migration (for all profiles), not by the
  dev seed.
- You have a JWT. Obtain one from the auth-service login endpoint. Seeded accounts use
  password **`Admin@1234`** (login IDs `teacher1`, `teacher2`, `student1`..`student4`,
  plus a PRINCIPAL/admin account). The seeded **parent** logs in with a username equal
  to their **phone number** `9100000002` (there is no `parent1` login; `parent1@artacademy.test`
  is merely the email). Teachers have phone numbers; students have a NULL phone. Pass the
  token as `Authorization: Bearer <token>` on every request.
- All mutating calls (POST/PUT/DELETE) require a **PRINCIPAL** token.
- Responses are wrapped in the common `ApiResponse` envelope (`success`, `data`,
  `message`).

Seeded IDs for reference:

- teacher1 (Aisha Khan, EMP-001) = `00000000-0000-0000-0002-000000000001`
- student1 (Meera Nair) = `00000000-0000-0000-0003-000000000001`
- parent (Sunita Nair, → student1) = `00000000-0000-0000-0004-000000000001`;
  logs in with username = phone `9100000002` (contact EMAIL/PHONE_NUMBER live on the base USERS row)

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
| S7 | Delete a student | `DELETE {BASE}/students/{id}` | PRINCIPAL | 200; `student-deleted` event published |
| S8 | Student views own profile | `GET {BASE}/students/me` | STUDENT (`student1`) | 200, own profile |
| S9 | Create/update with an email already used by another user | `POST`/`PUT {BASE}/students` | PRINCIPAL | 409 conflict "Email '...' is already in use" (the row being updated is excluded) |

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
| T6 | Delete a teacher | `DELETE {BASE}/teachers/{id}` | PRINCIPAL | 200, availability + exceptions removed too; `teacher-deleted` event published |
| T7 | Teacher views own profile | `GET {BASE}/teachers/me` | TEACHER (`teacher1`) | 200 |
| T8 | Create/update with an email already used by another user | `POST`/`PUT {BASE}/teachers` | PRINCIPAL | 409 conflict "Email '...' is already in use" (the row being updated is excluded) |

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
| P1 | Create a parent (may link zero or more children via `childStudentIds`) | `POST {BASE}/parents` | PRINCIPAL | 201, `parent-created` event (first creation of the parent login) |
| P2 | Re-post the same phone with another child | `POST {BASE}/parents` (same phone, diff studentId) | PRINCIPAL | 201, dedupes to existing parent and adds child link, **no** new `parent-created` event |
| P3 | Create parent referencing an unknown studentId | `POST {BASE}/parents` | PRINCIPAL | 404 not found |
| P4 | List / get parents | `GET {BASE}/parents`, `GET {BASE}/parents/{id}` | any read role | 200; `studentName` enriched |
| P5 | Update / delete parent | `PUT`/`DELETE {BASE}/parents/{id}` | PRINCIPAL | 200; DELETE publishes `parent-deleted` |
| P6 | Parent views own profile | `GET {BASE}/parents/me` | PARENT (phone `9100000002`) | 200 |
| P7 | Parent lists children | `GET {BASE}/parents/me/children` | PARENT (phone `9100000002`) | 200, one entry (Meera Nair) |

### Teacher Availability

| # | Scenario | Method & Path | Auth | Expected |
|---|----------|---------------|------|----------|
| A1 | Get availability | `GET {BASE}/teachers/{id}/availability` | PRINCIPAL/TEACHER/STUDENT | 200, slot list (possibly empty) |
| A2 | Set/replace availability | `PUT {BASE}/teachers/{id}/availability` | PRINCIPAL | 200, returns saved slots; old slots replaced |
| A3 | Get after replace | `GET {BASE}/teachers/{id}/availability` | read role | 200, matches last PUT |
| A4 | Set availability with endTime not after startTime | `PUT {BASE}/teachers/{id}/availability` | PRINCIPAL | 400 "End time must be after start time" |

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
| E6 | Partial-day exception missing start or end | `POST {BASE}/teachers/{id}/availability-exceptions` (`unavailableAllDay=false`, no start/end) | PRINCIPAL | 400 "Start and end time are required unless the exception is all day" |
| E7 | Partial-day exception endTime not after startTime | `POST {BASE}/teachers/{id}/availability-exceptions` (`unavailableAllDay=false`) | PRINCIPAL | 400 "End time must be after start time" |

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
  event fired with the new UUID and role list. P2 (re-posting the same phone to add a
  child) should produce **no** new `parent-created` event. Deletes publish
  `student-deleted`, `teacher-deleted`, and `parent-deleted` (deleteParent publishes
  `PARENT_DELETED`) respectively.
- **Pagination**: list endpoints accept `page`, `size` (default size 20), `sort`.
- **Idempotent seed**: re-running the service does not duplicate seed rows
  (`ON CONFLICT (ID) DO NOTHING`).
