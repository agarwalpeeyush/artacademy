# Mark Student Attendance — Requirement

## 1. Purpose

The "Mark Student Attendance" page lets a teacher or principal record attendance for a class session. The user identifies the session through a guided selection — **Course → Teacher → Batch → Date** — where the batch is one of the teacher's timetable slots for the course and the date is any calendar date. The system loads the chosen batch's roster and lets the user mark each student PRESENT or ABSENT. Extra students who attend a session but are not on the roster (for example, make-up attendees or students from another batch) can be added and marked as well. The same selection drives a bulk-range mode that applies attendance across a date range.

Because the batch is chosen directly and the date is independent of the batch's normal weekday, a class held on an unscheduled day is fully supported — for example, a Monday batch that meets on a Saturday because Monday was a holiday. The regular batch roster still loads, the actual session times can be recorded, and students from other batches can be added.

The teacher's identity is known from their login, so a teacher only ever marks their own classes. A principal marks on behalf of any teacher by selecting the teacher.

## 2. Selection flow

The page presents a cascading selection at the top:

1. **Course** — the user selects a course.
   - Teacher login: the list is limited to the courses that teacher teaches, derived from that teacher's timetable entries.
   - Principal login: any course.
2. **Teacher**
   - Teacher login: the field is pre-filled with the logged-in teacher and is read-only. The teacher cannot select anyone else.
   - Principal login: a Teacher dropdown, narrowed to the teachers who teach the selected course.
3. **Batch (timetable slot)** — the user picks one of the timetable slots for the chosen course and teacher, labelled by its scheduled day and time (for example, "Mon 17:00–18:00"). This identifies the batch whose roster will be marked. When only one slot exists for the course and teacher, it is selected automatically.
4. **Date** — the user picks the calendar date of the session. The date is **independent of the batch's scheduled weekday**: the same batch can be marked on its normal day or on any other day (an extra or rescheduled class). The day of week is derived from the date only where it is needed for display; it does not have to match the slot's day.

Once the batch is chosen, the roster loads: the ACTIVE enrolments assigned to that slot, each listed and defaulting to PRESENT. The slot's scheduled start and end time **prefill** the session-time fields and remain editable (see §3).

## 3. Session time (persisted, editable)

Each attendance record stores the session's **start and end time**:

- The times **prefill** from the chosen batch's timetable slot.
- The user can **edit** them before saving — for example, when a class actually ran 17:15–18:30 instead of the scheduled 17:00–18:00, or when an extra class on another day ran at a different time.
- The edited times are **persisted on the attendance records** in the attendance service.
- The **timetable and the enrolment are never changed** by this. The timetable is the plan and supplies the default; attendance is the record of what actually happened. An edited time lives only on that session's attendance rows.
- The attendance record stores its **calendar date** and its **times**; it does not store a weekday. The batch it belongs to is identified by the timetable slot, not by the date's weekday, so a batch can be marked on any date.

This applies to both modes: Single Day writes the (possibly edited) times onto that day's records, and Bulk Range writes the chosen start/end onto every record generated across the range.

## 4. Marking modes

### Single Day
- The roster for the chosen batch is listed, each student defaulting to PRESENT.
- The user sets each student's status (PRESENT, ABSENT) and optional remarks. Only two status are valid.
- **Add Student** adds a student who is not on the roster — any student, no filtering — so make-up attendees and students from other batches can be marked. Added rows are tagged (for example, "Make-up") and can be removed individually.
- **Save** persists attendance for the chosen batch, on the selected date, at the (possibly edited) session times, for every listed student.

### Bulk Range
- The same Course → Teacher → Batch selection identifies the batch; the batch's slot times prefill and remain editable.
- The user picks a **From** and **To** date and a single **status**, and applies it to the roster (plus any added students).
- The system generates the session dates in that range and upserts a record for each student on each date, at the chosen status and session times.

## 5. Role behaviour

| Aspect | Teacher login | Principal login |
| --- | --- | --- |
| Teacher field | Pre-filled with self, read-only | Dropdown to select the teacher |
| Course list | Only courses the teacher teaches | All courses |
| Date, batch selection, roster, marking, Add Student, bulk range | Same | Same |

The logged-in user and role come from Redux `state.auth` (`user`, `roles`). Roles are strings such as `ROLE_TEACHER` and `ROLE_PRINCIPAL`, checked with `roles.includes('ROLE_TEACHER')`. The auth `user.id` is the same id used as `teacherId` on timetables — `TeacherEnrollmentsPage` already relies on this, using `user?.id` directly with `timetableService.getByTeacher(teacherId)`.

## 6. Edge cases

- **No timetable slot** for the course and teacher: the batch list is empty, so there is nothing to mark. The page shows "No timetable entry for this course and teacher", loads no roster, and disables marking. Creating a slot from this page is out of scope.
- **Extra or rescheduled class on an unscheduled day**: fully supported. The user picks the batch and any date; the batch roster loads regardless of the date's weekday, the session times can be edited, and other-batch students can be added. No slot is created for the one-off day.
- **Empty roster** (a slot exists but has no active enrolments): the user can still use Add Student to mark make-up attendees.
- **Teacher teaches no courses**: the course list is empty with a helpful empty state.
- **user-service unavailable** during roster enrichment: the roster still renders, with names falling back gracefully, matching the existing behaviour.

## 7. Implementation

### Scope
Frontend and attendance-service. The selection cascade and slot resolution are frontend work; persisting editable session times requires additive changes in the attendance service.

### Frontend
Page: `frontend-react/src/pages/principal/MarkStudentAttendancePage.tsx`.

- Replace the top selection area with the cascade: a **Course** Autocomplete, a **Teacher** field (a read-only chip for a teacher login, an Autocomplete for a principal), a **Batch** picker (the course-and-teacher's timetable slots, labelled by day and time), a **Date** picker, and editable **Start/End time** fields prefilled from the chosen slot.
- Build the batch list by fetching `timetableService.getByCourse(courseId)` and filtering by `teacherId`. The user picks a slot directly; do not filter it by the date's weekday. When exactly one slot exists, auto-select it. Store the chosen slot and seed the editable time state from its `startTime`/`endTime`.
- Load the roster with `enrollmentService.getByTimetable(slot.id)` (ACTIVE enrolments, `studentName` populated) and `studentService.getByCourse(slot.courseId)` for the Add-Student list.
- Keep the two-tab layout (Single Day, Bulk Range), the per-row status controls, Add Student, Save, and the bulk-range date expansion. Include the (possibly edited) `startTime`/`endTime` in the Save and bulk-range payloads.
- Gate the Teacher field and the course list on `roles.includes('ROLE_TEACHER')` versus principal.

Reuse:
- `utils/enrollmentHelpers.ts`: `buildCourseTeacherMap(timetables)` (`courseId → Set<teacherId>`, for the principal's per-course teacher list), `teacherCoursesFromTimetables(timetables, teacherId, courses)` (a teacher's course list), `formatSlotLabel(slot)`.
- `utils/formatters.ts`: `getDayName(dayOfWeek)`, `formatTime(t)`.
- Redux slices `fetchCourses`, `fetchTeachers`, `fetchStudents`; auth from `store/slices/authSlice.ts`.
- Services: `courseService.getAll()`, `teacherService.getAll()`, `studentService.getByCourse/getAll`, `enrollmentService.getByTimetable`, `attendanceService.markStudentAttendance` and `markStudentBulkRange`.

### Attendance service
The attendance record gains a start and end time. The upsert identity stays **(studentId, timetableId, attendanceDate)** — the times are attributes, not part of the key — so this is additive and does not affect uniqueness.

- `domain/StudentAttendance.java`: add `LocalTime startTime` and `LocalTime endTime` (nullable).
- Flyway migration: add `START_TIME TIME` and `END_TIME TIME` columns to `STUDENT_ATTENDANCE`, nullable. No backfill (dev databases are reseeded).
- `dto/StudentAttendanceRequest.java` and `dto/StudentAttendanceResponse.java`: add `startTime` and `endTime` (`LocalTime`), nullable.
- `dto/TimetableRangeAttendanceRequest.java`: add `startTime` and `endTime`, applied to every record generated in `StudentAttendanceService.markTimetableAttendanceForRange`.
- `service/StudentAttendanceService.java`: set the times on insert, and refresh them on the upsert-update path so an edited time overwrites a prior value.
- `mapper/StudentAttendanceMapper.java`: field names match, so MapStruct maps the new fields automatically; regenerate and verify.

Course-enrollment-service and the timetable are not changed — the times are copied into attendance at write time and the timetable stays the source of the defaults.

## 8. Verification

Backend: `mvn -pl attendance-service -am clean package -DskipTests -q`, then `docker compose restart attendance-service` from `docker/`.

Frontend (served by an nginx multi-stage Docker build, no hot reload): typecheck with `cd C:/SAPDevelop/artacademy/artacademy/frontend-react && npx tsc --noEmit`, then `docker compose up -d --build frontend-react` from `docker/`, and hard-refresh (Ctrl+Shift+R).

End-to-end, logging in through the gateway (host port 18080, token from `/auth/login`):

1. **Teacher login**: the Teacher field is pre-filled and read-only; the course list shows only that teacher's courses; picking a course lists that teacher's batches; picking a batch loads its roster with names and prefills the slot times; choosing a date, setting statuses, and saving succeeds. Repeat on Bulk Range with a date range.
2. **Principal login**: the same, with a Teacher dropdown; the batch list reflects the chosen course and teacher.
3. **Extra-class case**: pick a batch and a date whose weekday differs from the batch's scheduled day (for example, a Saturday date for a Monday batch). The batch roster still loads, other-batch students can be added via Add Student, and saving records the session on that date. Confirm the timetable slot is unchanged.
4. **Editable time persists**: change the start/end time before saving, save, then re-open the same slot and date via `GET /attendance/students/timetable/{slotId}/date?date=...` and confirm the record carries the edited times. Confirm `GET /timetables/{slotId}` still shows the original slot time, proving the timetable is unaffected.
5. **API sanity**: `GET /timetables/course/{courseId}` returns the slots used for the batch list, and `GET /enrollments/timetable/{slotId}` returns the roster with `studentName`.
