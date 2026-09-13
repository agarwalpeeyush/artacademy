# TODO

Items required by the project skills spec (`art_academy_skills/*.md`) that are not yet implemented.

---

## Known Bugs / Discrepancies

Student should also have an attributes like school name, class name (i refer here school class, not the class object present in this project). 

Pull TimeTable display in the master data. 
Remove room-availability page. 

Fee can be of 3 types: Admission Fee, Monthly fee, Exam Fee, One Time ShortTerm Course Fee for some courses. 
Course Type can be broadly defined in 3 categories: Drawing, Academics, Specialized Craft
Depending upon course type, one or more fee can be applicable: Regular Drawing class has Admission and Monthly fee, academics has Monthly fee, Specialized Craft has One Time ShortTerm Course Fee

Student Attendance has to be per enrolled class meaning a student can be enrolled in multiple classes and attendance has to be marked for each class.
As principal, I should be able to mark the attendance for students. Create a page for principal to mark the attendance for students.
Implement Bulk Attendance marking for teachers and students for principal.
Implement Bulk Attendance marking for students by teacher.
Input will be list of students or teachers and start and end date. 
Similarly, teacher attendance has to be marked for each class. Create a page for principal to mark the attendance for teachers per class they are taking.
Attendance Report for Students should list the student name, class name, course name, teacher name, date, attendance status. (View for principal and teacher). Also student can view his attendance for last 3 months for all the courses he is enrolled.
Attendance Report for Teachers should list the teacher name, class name, course name, date, attendance status. (View for principal and teacher). Also teacher can view his attendance for last 3 months for all the courses he is taking.
For Attendance correction:  principal selects the student or teacher and update the attendance for the selected date for the selected class. Bulk operation supported. Similarily teacher can also update the student attendance for the selected class. Bulk operation supported.

remove all seed data from the project. I just need it for one principal role.



These are actual code behaviors that diverge from the intended design. They are currently
documented "as-implemented" in the relevant `DESIGN.md` files; fix the code later.



- [ ] **notification-service: SMS marked SENT without delivery**
  - There is no SMS provider integrated. An `SMS`-channel notification is optimistically set to
    `status = SENT` with a `sentAt` timestamp even though nothing is actually sent
  - Either integrate an SMS provider or leave SMS notifications `PENDING`/`FAILED` honestly

- [ ] **`notificationSlice` wired to backend**
  - Redux slice exists but no Notifications page is rendered for any role in the current routing

- [ ] The notification feature still won't function: the backend only implements POST /notifications/send and GET /notifications/{userId}. The 3 endpoints the frontend needs — GET
  /notifications (current user), PUT /notifications/{id}/read, PUT /notifications/read-all — don't exist yet.

---

## Cross-cutting

- [ ] **Redis usage** — DEFERRED (needs its own design)
  - Redis container is running in docker-compose but no service currently uses it
  - Candidates: JWT refresh token blacklist in auth-service, rate-limiting cache, session cache

- [ ] **Class Notes / Remarks (Teacher)** — DEFERRED (needs its own design)
  - Spec lists "Class Notes/Remarks" under Teacher > Teaching; no backend entity or UI exists

- [ ] **Student Profile edit (Student role)** — DEFERRED (needs UI work)
  - Backend `PUT /students/{id}` exists, but `StudentProfilePage` is display-only — it fetches via
    `getMyProfile()` and renders; there is no edit form and no profile-photo field
  - Building the edit UI (and adding a photo field if wanted) is a frontend feature, not a bug fix

---

Mobile / PWA & Notifications

- [ ] **Notification bell / inbox (all roles)**
  - Frontend: Notifications page per role (Student, Teacher, Principal)
  - Show unread count badge on sidebar icon
  - notification-service should send email, SMS and have whatsapp send capability (can be configured by Principal role)
  - Integrate with a provider (Firebase FCM or web push) for in-browser notifications

- [ ] **PWA configuration**
  - Add `manifest.json` and a service worker to the React app
  - Enables "Add to Home Screen" on mobile browsers

- [ ] **Announcement notifications**
  - Principal can send a broadcast announcement to all students / teachers
  - Teacher can broadcast an announcement to their own students, depending upon whether principal has given this permission to teacher. Every teacher should not be able to send announcement. This is a permission that can be set by the principal.
  - Announcements management page in Principal > Administration

---

## Phase 8 — Production, DevOps & Enterprise

- [ ] **CI/CD pipeline**
  - GitHub Actions (or equivalent) workflow: build → test → Docker build → push to registry
  - No `.github/workflows/` directory currently exists

- [ ] **Automated tests**
  - Backend: unit tests for service layer (JUnit 5 + Mockito), integration tests with Testcontainers
  - Frontend: component tests (React Testing Library), E2E tests (Playwright or Cypress)
  - No test files found under any `src/test/` directory

- [ ] **Kubernetes / Helm manifests**
  - Add `k8s/` or `helm/` chart directory for production deployment
  - Currently only Docker Compose exists

- [ ] **Structured logging with correlation IDs**
  - Add a request-scoped MDC `correlationId` propagated across service calls via headers
  - ELK stack is deployed in docker-compose but services may not emit structured JSON logs yet

- [ ] **Distributed tracing**
  - Integrate Spring Boot Actuator + Micrometer with Zipkin or Tempo
  - Add tracing spans across API Gateway → service → Kafka consumer hops

- [ ] **Health check endpoints**
  - Verify `/actuator/health` is exposed and reachable on all services
  - Add readiness/liveness probe configuration in docker-compose and K8s manifests

- [ ] **API documentation**
  - Swagger/OpenAPI is wired per service but there is no aggregated API docs portal
  - Expose a combined OpenAPI spec through the API Gateway or a dedicated docs page

- [ ] **Security scanning**
  - Add OWASP Dependency-Check or Trivy to the CI pipeline
  - Scan Docker images for CVEs before deployment

- [ ] **Backup / restore procedure**
  - Document and script PostgreSQL `pg_dump` / `pg_restore` for each database
  - Add a cron-based backup container or external backup job to docker-compose

- [ ] **Multi-branch / multi-tenant support** *(enterprise extension)*
  - Add `branchId` / `tenantId` to all core entities (students, teachers, courses, rooms, schedules)
  - Branch-scoped API endpoints and UI switcher

- [ ] **Gallery / website content management** *(from role-screens spec)*
  - Principal > Administration: Gallery page (upload / manage academy photos)
  - Static content CMS for the public-facing academy website

- [ ] **System Settings page (Principal)**
  - Configure academy name, address, logo, academic year, notification preferences
  - Backend: key-value settings store

---
