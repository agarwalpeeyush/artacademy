# course-enrollment-service — Design

Manages courses, course types, fees, enrollments, exams, and weekly timetable slots. The former standalone class ("CourseClass") model was fully removed and timetabling was folded in from a former standalone timetable-service — there is no "class" concept; scheduling is done with course + timetable slots. Port 8083, database `academic_db`. Spring Boot 3.3.4 / Java 21, PostgreSQL (Flyway validate), Kafka, JWT via common-library. Responses wrapped in `ApiResponse<T> {success, message, data}` EXCEPT TimetableController (see below).

## Endpoints

### CourseController (ApiResponse)
| Method | Path | Access |
|--------|------|--------|
| GET | `/courses` | list / filter by type |
| GET | `/courses/{id}` | |
| POST/PUT/DELETE | `/courses/{id}` | PRINCIPAL |

### CourseTypeController (ApiResponse)
| Method | Path | Access |
|--------|------|--------|
| GET | `/course-types` | |
| POST/PUT/DELETE | `/course-types` | PRINCIPAL |

### EnrollmentController (ApiResponse)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/enrollments` | PRINCIPAL/TEACHER |
| GET | `/enrollments` | |
| GET | `/enrollments/student/{studentId}` | |
| GET | `/enrollments/course/{courseId}` | |
| GET | `/enrollments/timetable/{timetableId}` | Roster for a slot |
| DELETE | `/enrollments/{id}` | Cancel |
| PUT | `/enrollments/{id}/status` | |
| PUT | `/enrollments/{id}/fees` | Override fee lines |
| PUT | `/enrollments/{id}/timetables` | Assign slots |

### ExamController (ApiResponse)
| Method | Path | Access |
|--------|------|--------|
| GET | `/exams` | optionally by course |
| POST | `/exams` | PRINCIPAL |

### TimetableController — RETURNS RAW arrays/objects, NOT ApiResponse
| Method | Path | Notes |
|--------|------|-------|
| GET | `/timetables` | |
| GET | `/timetables/{id}` | |
| POST/PUT/DELETE | `/timetables/{id}` | PRINCIPAL |
| GET | `/timetables/conflicts` | Teacher double-book / course overlap |
| GET | `/timetables/upcoming` | Params `courseIds`, `limit` — projects weekly slots onto calendar dates |
| GET | `/timetables/teacher/{teacherId}` | |
| GET | `/timetables/course/{courseId}` | |
| GET | `/timetables/student/{studentId}` | |

## Entities

| Entity | Key fields |
|--------|-----------|
| Course | courseCode (unique), courseName, courseTypeId, description, durationMonths, status |
| CourseType | code (unique), name, status |
| CourseFee | courseId, feeType, amount, cadence; unique (courseId + feeType) |
| Enrollment | studentId, courseId — unique(studentId, courseId), enrollmentDate, status, timetables (M2M via ENROLLMENT_TIMETABLES) |
| EnrollmentFee | enrollmentId, feeType, amount — snapshot at enrol time |
| Timetable | courseId, teacherId, dayOfWeek (enum), startTime, endTime — NO status/active column |
| Exam | courseId, examDate, times |

## Migrations

| Version | Description |
|---------|-------------|
| V1 | course_types, course_fee_types, courses, course_fees, enrollments, enrollment_fees, exams, timetables, enrollment_timetables |

Latest: V1. No seed data — courses/enrollments are created at runtime by an authenticated principal.

## Kafka

- **Produces:** `enrollment-created` (carries full fee set as `List<FeeItem>`), `enrollment-cancelled`, `exam-scheduled`.
- **Consumes:** none.

## Cross-Service

`UserServiceClient` (load-balanced WebClient, forwards the caller's JWT) calls user-service `/students` and `/teachers` to enrich responses with `studentName` / `teacherName`.
