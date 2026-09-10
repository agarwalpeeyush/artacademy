# Art Academy Platform — UI Testing Guide

This document lists manual UI test scenarios grouped by role and feature. It assumes the stack is
running (see `README.md`) with the **`docker`/`dev` profile active** so the seeded sample data
(`V2__seed_dev_data.sql`) is present. A default-profile (clean) start has schema only — no data.

## Test Accounts

All accounts share the password **`Admin@1234`**. Emails follow `<username>@artacademy.test`.

| Username | Role | Notes |
|----------|------|-------|
| `principal` | PRINCIPAL | Administrator |
| `teacher1` | TEACHER | Aisha Khan, EMP-001, Painting - Batch A |
| `teacher2` | TEACHER | Rahul Verma, EMP-002, Sculpture - Batch A |
| `student1` | STUDENT | Meera Nair — Painting + Sculpture; Aug 2026 fees PAID, Sep 2026 UNPAID |
| `student2` | STUDENT | Arjun Sharma — Painting; Sep 2026 fees UNPAID |
| `student3` | STUDENT | Diya Patel — Sculpture |
| `student4` | STUDENT | Kabir Singh — Painting |
| `parent1` | PARENT | Sunita Nair — linked to student1 |

Seeded reference data: courses *Painting* (PAINT-101, ₹2500/mo) & *Sculpture* (SCULP-101, ₹3000/mo);
classes *Painting - Batch A* (Mon/Wed 10:00–11:30, Studio 1, teacher1) & *Sculpture - Batch A*
(Tue/Thu 14:00–15:30, Studio 2, teacher2), both PUBLISHED; fee cycles for Aug & Sep 2026.

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
| P1 | Dashboard metrics | Open `/principal/dashboard` | Cards show non-zero totals (students=4, teachers=2, courses=2, classes=2); revenue reflects the seeded ₹5500 August payment |
| P2 | Analytics | Open `/principal/analytics` | Charts render without error |
| P3 | Audit logs | Open `/principal/audit-logs`; filter by `principal` | Recent login rows listed; pagination works |

### 1.2 People
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P4 | Students list + search | `/principal/students`; search "Meera" | List filters to student1 |
| P5 | Student detail | Click a student | Tabs show enrolments, attendance, fees, timetable |
| P6 | Create student | Add a new student via form | Appears in list; auth user created via `student-created` event |
| P7 | Edit/delete student | Edit a field; delete a test student | Changes persist; deleted row removed |
| P8 | Teachers list & detail | `/principal/teachers` → open teacher1 | Shows classes, timetable, availability, attendance |
| P9 | User management | `/principal/users` | All 8 seeded users listed with roles/status |
| P10 | Toggle account status | Deactivate a test user, then try logging in as them | Login rejected while INACTIVE |
| P11 | Edit roles | Open role dialog for a user; change roles; save | Roles updated in list |

### 1.3 Academy
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P12 | Courses & detail | `/principal/courses` → open PAINT-101 | Fees, classes, teacher, enrolled students shown |
| P13 | Classes | `/principal/classes` | Two seeded classes with capacity/room |
| P14 | Enrolments | `/principal/enrollments` | Five seeded enrolments; create a new one; a duplicate active (same student+course) is rejected |

### 1.4 Timetable
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P15 | Timetable | `/principal/timetable` | Four seeded PUBLISHED slots visible across the week |
| P16 | Create draft entry | Add a new slot | Created as DRAFT (not yet visible to student/teacher) |
| P17 | Room availability | `/principal/room-availability`; pick Studio 1 + a Monday | Occupied 10:00–11:30; free slots elsewhere within 08:00–20:00 |
| P18 | Publish | `/principal/timetable-publish`; publish a draft | Entry becomes PUBLISHED |
| P19 | Unpublish | Toggle a published row to unpublish | Row returns to DRAFT |

### 1.5 Attendance & Finance
| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P20 | Attendance report | `/principal/attendance`; filter by class/date range | Seeded attendance rows returned |
| P21 | Export CSV | Click export on attendance report | CSV downloads with the filtered rows |
| P22 | Corrections review | `/principal/attendance-corrections` after a teacher submits one | Pending request shown; approve → underlying record updates; reject → status REJECTED |
| P23 | Revenue | `/principal/revenue` | Shows the seeded Aug 2026 collection (₹5500) |
| P24 | Defaulters | `/principal/defaulters` | student1 (Sep UNPAID) and student2 (Sep UNPAID) appear |
| P25 | Announcements | `/principal/announcements`; send to ALL_STUDENTS | Announcement recorded; recipient count > 0 |

---

## 2. Teacher (login as `teacher1`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| T1 | Dashboard | `/teacher/dashboard` | Weekly class count + today's timetable |
| T2 | Timetable | `/teacher/timetable` | Painting - Batch A on Mon & Wed 10:00–11:30 (published only) |
| T3 | Mark attendance | `/teacher/attendance`; pick Painting - Batch A + a date; mark present/absent; submit | Saved; re-opening the date shows the marks |
| T4 | My attendance | `/teacher/my-attendance` | Own attendance rows; can record a new day |
| T5 | Submit correction | `/teacher/corrections`; request a change to a past student record with a reason | Request created as PENDING (visible to Principal in P22) |
| T6 | My students | `/teacher/students` | Students in teacher1's classes (student1, student2, student4) |
| T7 | Fee status | `/teacher/fee-status` | Fee/outstanding status for assigned students |
| T8 | Availability exceptions | `/teacher/availability-exceptions`; add an all-day leave; then a partial-time one; delete one | Added rows listed; delete removes the row |
| T9 | Announcement (if permitted) | `/teacher/announcements` | Compose enabled only when Principal granted broadcast permission |

---

## 3. Student (login as `student1`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| S1 | Dashboard | `/student/dashboard` | Active enrolments (2), attendance %, outstanding (Sep ₹5500), today's classes |
| S2 | Profile edit | `/student/profile`; edit a contact field; save | Change persists on reload |
| S3 | Attendance | `/student/attendance` | Seeded present/absent rows per class |
| S4 | Timetable (multi-course) | `/student/timetable` | Shows **both** Painting (Mon/Wed) and Sculpture (Tue/Thu) — verifies multi-class join |
| S5 | Upcoming classes | `/student/upcoming` | Chronological list of the next sessions with real calendar dates, ascending |
| S6 | Enrolments | `/student/enrollments` | Painting + Sculpture, ACTIVE |
| S7 | Fees | `/student/fees` | Aug 2026 PAID + Sep 2026 UNPAID cycles with per-course breakdown |
| S8 | Make payment | As `student2`, open `/student/fees` and pay the Sep UNPAID cycle | Status moves toward PAID/PARTIAL; payment recorded |
| S9 | Receipts | `/student/receipts` | Receipt for the seeded/most recent payment is viewable (PDF) |
| S10 | Draft not visible | After Principal creates a DRAFT slot for student1's class, reload `/student/timetable` | DRAFT slot does **not** appear until published |

---

## 4. Parent (login as `parent1`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| PA1 | Dashboard | `/parent/dashboard` | 1 child, average attendance, total outstanding |
| PA2 | My children | `/parent/children` | student1 (Meera Nair) listed |
| PA3 | Child attendance | `/parent/attendance` | student1's attendance records |
| PA4 | Upcoming classes | `/parent/upcoming`; select the child | Chronological upcoming sessions for that child |
| PA5 | Fees | `/parent/fees` | student1's fee cycles; pay action available for the Sep outstanding |
| PA6 | Notifications | `/parent/notifications` | Notification list renders (may be empty until events fire) |

---

## 5. Cross-Cutting Checks

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| X1 | Empty states | Visit a page with no data (e.g. a new teacher's timetable) | Friendly "no data" message, not an error |
| X2 | Loading states | Throttle network; navigate | Spinner shown, then content |
| X3 | Error handling | Stop a backend service; trigger a call | Error surfaced gracefully; app does not crash |
| X4 | Token refresh | Stay idle past access-token expiry, then act | Silent refresh; action succeeds without re-login |
| X5 | Idempotent seed | Restart a seeded service | No duplicate rows; existing custom data preserved |
| X6 | Responsive layout | Resize to 768px and 375px | Sidebar/table remain usable (note: full mobile audit is backlog) |

---

## 6. How to Reset Test Data

Full reset (drops all volumes; re-creates schema and re-seeds on next start under the docker profile):

```bash
cd docker
docker compose down -v
docker compose up -d --build
```

Because seed migrations use `ON CONFLICT DO NOTHING`, a normal restart keeps any data you created
during testing and does not re-insert duplicates. A default-profile start (no `docker`/`dev`
profile) applies only `V1` schema — useful for verifying a clean production-like install.
