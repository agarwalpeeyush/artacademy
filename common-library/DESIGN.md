# Common Library — Design

## Overview

`common-library` is a shared JAR dependency used by every Art Academy
service. It is not deployable and has no port, database, or Kafka runtime
of its own. It centralizes the contracts that must be identical across the
platform: Kafka event DTOs and topic constants, JWT utilities, a uniform
API response envelope, an exception model, and shared logging. Built on
Spring Boot 3.3.4 / Java 21.

## Kafka Event Contract

### Event DTOs (`events/`)

`StudentCreatedEvent`, `TeacherCreatedEvent`, `ParentCreatedEvent`,
`StudentDeletedEvent`, `TeacherDeletedEvent`, `ParentDeletedEvent`,
`EnrollmentCreatedEvent`, `EnrollmentCancelledEvent`,
`AttendanceRecordedEvent`, `AttendanceUpdatedEvent`, `FeeGeneratedEvent`,
`PaymentReceivedEvent`, `FeeStatusUpdatedEvent`, `ExamScheduledEvent`,
`TimetableGeneratedEvent`, `NotificationRequestEvent`.

Selected payloads:

- `EnrollmentCreatedEvent`: `enrollmentId`, `studentId`, `courseId`,
  `List<FeeItem> fees` (`feeType`, `amount`, `cadence`), `occurredAt`.
- `AttendanceRecordedEvent`: `attendanceType`, `subjectId`, `status`,
  `attendanceDate`, `courseId`, `courseName`, `occurredAt`.
- `NotificationRequestEvent`: `recipientEmail`, `recipientPhone`,
  `subject`, `body`, `channel` (`EMAIL`/`SMS`/`BOTH`), `occurredAt`.

### Topic Constants (`KafkaTopics`)

Hyphenated strings: `student-created`, `teacher-created`, `parent-created`,
`student-deleted`, `teacher-deleted`, `parent-deleted`,
`enrollment-created`, `enrollment-cancelled`, `attendance-recorded`,
`attendance-updated`, `fee-generated`, `payment-received`,
`fee-status-updated`, `exam-scheduled`, `timetable-generated`,
`timetable-updated`, `notification-request`.

Note: some DTOs and constants are available for use but have no active
producer or consumer today (e.g. `TimetableGeneratedEvent` /
`timetable-generated` and `timetable-updated`); treat these as available
constants.

## Fee Enums (`fee/`)

| Enum | Values |
| --- | --- |
| `FeeType` | `ADMISSION`, `MONTHLY`, `EXAM`, `ONE_TIME_SHORT_TERM` |
| `FeeCadence` | `RECURRING`, `ONE_TIME` |

## Shared API Contract

- `ApiResponse<T>` — `{ boolean success; String message; T data; }` with
  static `success` / `error` builders.
- `ApiException(message, HttpStatus)` — factories `notFound`, `badRequest`,
  `forbidden`, `conflict`.

## Security

- `JwtUtil` — generate/validate tokens carrying roles and a bootstrap
  claim; 15-minute expiry.
- `JwtAuthenticationFilter` — servlet filter that populates the
  `SecurityContext` with `ROLE_`-prefixed authorities.

## Logging

`logback-spring.xml` defines a `CONSOLE` appender (non-docker) and a
`LOGSTASH` JSON appender (docker profile) shipping to `logstash:5000`,
adding a `service` field to each log line.
