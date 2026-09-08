# Art Academy Platform — UI Testing Guide

This document lists manual UI test scenarios grouped by role and feature. It assumes the stack is
running (see `README.md`) and the **seeded sample data** is present.

## Test Accounts

All accounts share the password **`Admin@1234`**.

| Username | Role |
|----------|------|
| `principal` | PRINCIPAL |
| `teacher1` | TEACHER |
| `teacher2` | TEACHER |
| `student1` | STUDENT (Painting + Sculpture; fees PAID) |
| `student2` | STUDENT (Painting; fees UNPAID) |
| `student3` | STUDENT (Sculpture) |
| `parent1` | PARENT (linked to student1) |

Seeded reference data: courses *Foundations of Painting* (PAINT-101) & *Introduction to Sculpture*
(SCULPT-101); classes *Painting A - Morning* (Mon/Wed 09:00–11:00, Studio 1) & *Sculpture A - Evening*
(Tue/Thu 15:00–17:00, Studio 2); an Aug 2026 fee cycle (student1 PAID, student2 UNPAID).

**Legend:** each scenario lists **Steps** and the **Expected** result. Mark Pass/Fail as you go.

---

## 0. Authentication (all roles)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| A1 | Valid login | Go to `/login`, enter `principal` / `Admin@1234` | Redirect to `/principal/dashboard` |
| A2 | Role-based landing | Log in as each role | Land on that role's dashboard; only that role's sidebar shown |
| A3 | Invalid password | Enter `principal` / `wrong` | Inline error; no redirect |
| A4 | Rate limiting | Enter wrong password 5× for one username | 6th attempt reports account locked (15 min) |
| A5 | Forgot password | `/login` → "Forgot password", submit email | Confirmation shown; reset flow reachable at `/reset-password` |
| A6 | Route guard | While logged out, visit `/principal/dashboard` | Redirect to `/login` |
| A7 | Cross-role guard | As `student1`, manually visit `/principal/users` | Blocked / redirected (insufficient role) |
| A8 | Logout | Use logout control | Session cleared; redirect to `/login`; back button does not restore app |

---

## 1. Principal

### 1.1 Dashboard & Analytics
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P1 | Dashboard metrics | Open `/principal/dashboard` | Cards show non-zero totals (students=3, teachers=2, courses=2, classes=2), revenue reflects the seeded payment |
| P2 | Analytics | Open `/principal/analytics` | Charts render without error |
| P3 | Audit logs | Open `/principal/audit-logs`; filter by `principal` | Recent login rows listed; pagination works |

### 1.2 People
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P4 | Students list + search | `/principal/students`; search "Meera" | List filters to student1 |
| P5 | Student detail | Click a student | Tabs show enrolments, attendance, fees, schedule |
| P6 | Create student | Add a new student via form | Appears in list; (auth user created via event) |
| P7 | Edit/delete student | Edit a field; delete a test student | Changes persist; deleted row removed |
| P8 | Teachers list & detail | `/principal/teachers` → open teacher1 | Shows classes, schedule, availability, attendance |
| P9 | User management | `/principal/users` | All 7 seeded users listed with roles/status |
| P10 | Toggle account status | Deactivate a test user, then try logging in as them | Login rejected while INACTIVE |
| P11 | Edit roles | Open role dialog for a user; change roles; save | Roles updated in list |

### 1.3 Academy
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P12 | Courses & detail | `/principal/courses` → open PAINT-101 | Fees, classes, teacher, enrolled students shown |
| P13 | Classes | `/principal/classes` | Two seeded classes listed with capacity/room |
| P14 | Enrolments | `/principal/enrollments` | Four seeded enrolments; create a new one; duplicate (same student+course) is rejected |

### 1.4 Scheduling
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P15 | Timetable | `/principal/timetable` | Four seeded slots visible across the week |
| P16 | Create draft schedule | Add a new slot | Created as DRAFT (not yet visible to student/teacher) |
| P17 | Room availability | `/principal/room-availability`; pick Studio 1 + a Monday date | Occupied 09:00–11:00; free slots elsewhere |
| P18 | Conflicts | Create two overlapping slots (same teacher/room/time); open `/principal/conflicts` | Conflict row with correct type (TEACHER/ROOM/CLASS) |
| P19 | Publish | `/principal/schedule-publish`; click "Publish All Drafts" | Draft count → 0; all rows PUBLISHED |
| P20 | Unpublish | Toggle a published row to unpublish | Row returns to DRAFT |
| P21 | History | `/principal/schedule-history` | A new version listed after publishing; selecting it shows its entries |

### 1.5 Attendance & Finance
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P22 | Attendance report | `/principal/attendance`; filter by class/date range | Seeded attendance rows returned |
| P23 | Export CSV | Click export on attendance report | CSV downloads with the filtered rows |
| P24 | Corrections review | `/principal/attendance-corrections` after a teacher submits one | Pending request shown; approve → underlying record updates; reject → status REJECTED |
| P25 | Revenue | `/principal/revenue` | Shows the seeded Aug 2026 collection |
| P26 | Defaulters | `/principal/defaulters` | student2 appears (UNPAID) |

---

## 2. Teacher (login as `teacher1`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| T1 | Dashboard | `/teacher/dashboard` | Weekly class count + today's schedule |
| T2 | Schedule | `/teacher/schedule` | Painting A on Mon & Wed 09:00–11:00 (published only) |
| T3 | Mark attendance | `/teacher/attendance`; pick Painting A + a date; mark present/absent; submit | Saved; re-opening the date shows the marks |
| T4 | My attendance | `/teacher/my-attendance` | Own attendance rows; can record a new day |
| T5 | Submit correction | `/teacher/corrections`; request a change to a past student record with a reason | Request created as PENDING (visible to Principal in P24) |
| T6 | My students | `/teacher/students` | Students enrolled in teacher1's classes (student1, student2) |
| T7 | Fee status | `/teacher/fee-status` | Fee/outstanding status for assigned students |
| T8 | Availability exceptions | `/teacher/availability-exceptions`; add an all-day leave for a date; then a partial-time one; delete one | Added rows listed; delete removes the row |

---

## 3. Student (login as `student1`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| S1 | Dashboard | `/student/dashboard` | Active enrolments (2), attendance %, outstanding (0), today's classes |
| S2 | Profile edit | `/student/profile`; edit a contact field; save | Change persists on reload |
| S3 | Attendance | `/student/attendance` | Seeded present/absent rows per class |
| S4 | Schedule (multi-course) | `/student/schedule` | Shows **both** Painting (Mon/Wed) and Sculpture (Tue/Thu) — verifies multi-class join |
| S5 | Upcoming classes | `/student/upcoming` | Chronological list of the next sessions with real calendar dates, ascending |
| S6 | Enrolments | `/student/enrollments` | Painting + Sculpture, ACTIVE |
| S7 | Fees | `/student/fees` | Aug 2026 cycle shown as PAID with per-course breakdown |
| S8 | Make payment | As `student2`, open `/student/fees` and pay the UNPAID cycle | Status moves toward PAID/PARTIAL; payment recorded |
| S9 | Receipts | `/student/receipts` | Receipt for the seeded/most recent payment is viewable |
| S10 | Draft not visible | After Principal creates a DRAFT slot for student1's class, reload `/student/schedule` | DRAFT slot does **not** appear until published |

---

## 4. Parent (login as `parent1`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| PA1 | Dashboard | `/parent/dashboard` | 1 child, average attendance, total outstanding |
| PA2 | My children | `/parent/children` | student1 listed |
| PA3 | Child attendance | `/parent/attendance` | student1's attendance records |
| PA4 | Upcoming classes | `/parent/upcoming`; select the child | Chronological upcoming sessions for that child |
| PA5 | Fees | `/parent/fees` | student1's fee cycles; pay action available for any outstanding |
| PA6 | Notifications | `/parent/notifications` | Notification list renders (may be empty until events fire) |

---

## 5. Cross-Cutting Checks

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| X1 | Empty states | Visit a page with no data (e.g. a new teacher's schedule) | Friendly "no data" message, not an error |
| X2 | Loading states | Throttle network; navigate | Spinner shown, then content |
| X3 | Error handling | Stop a backend service; trigger a call | Error surfaced gracefully; app does not crash |
| X4 | Token refresh | Stay idle past access-token expiry, then act | Silent refresh; action succeeds without re-login |
| X5 | Idempotent seed | Restart services | No duplicate rows; existing custom data preserved |
| X6 | Responsive layout | Resize to 768px and 375px | Sidebar/table remain usable (note: full mobile audit is backlog) |

---

## 6. How to Reset Test Data

Full reset (drops all volumes; re-seeds on next start):

```bash
cd docker
docker compose down -v
docker compose up -d
```

Because seed migrations use `ON CONFLICT DO NOTHING`, a normal restart keeps any data you created
during testing and does not re-insert duplicates.
