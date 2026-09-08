# TODO

Items required by the project skills spec (`art_academy_skills/*.md`) that are not yet implemented.

> **Completed and removed from this backlog:** Phase 2 (Authentication & Role Management),
> Phase 3 (Academy Management), Phase 4 (Attendance), and Phase 5 (Scheduling & Timetable) are
> fully implemented. See `PRD.md` for the delivered feature catalogue and `TESTING.md` for the
> corresponding UI test scenarios.

---

## Known Bugs / Discrepancies (discovered during DESIGN.md audit)

These are actual code behaviors that diverge from the intended design. They are currently
documented "as-implemented" in the relevant `DESIGN.md` files; fix the code later.

- [ ] **payment-service returns raw DTOs, not `ApiResponse<T>`**
  - Every other business service wraps responses in the shared `ApiResponse<T>` envelope, but
    payment-service controllers return raw DTOs (`List<FeeCycleResponse>`, `PaymentResponse`, etc.)
  - Response-shape inconsistency for API clients; wrap in `ApiResponse<T>` for consistency

- [ ] **payment-service: live-cached enrollments get `courseFee = 0`**
  - `EnrollmentCreatedEvent` carries no course fee, so `ENROLLMENT_CACHE.courseFee` defaults to 0
    for enrollments cached from live Kafka events — fee cycles generated from them total **0**
  - Only the V3 seed rows carry real fees. Wire up a fee-update event or include the fee in the
    enrollment event so live fee generation produces non-zero amounts

- [ ] **payment-service: overpayment surplus is not tracked**
  - If a payment `amount` exceeds the cycle's total outstanding, the surplus is logged as a warning
    but is **not** recorded as a credit/refund anywhere (only allocations up to outstanding are made)
  - Track overpayment as a credit balance or reject/split it explicitly

- [ ] **notification-service: SMS marked SENT without delivery**
  - There is no SMS provider integrated. An `SMS`-channel notification is optimistically set to
    `status = SENT` with a `sentAt` timestamp even though nothing is actually sent
  - Either integrate an SMS provider or leave SMS notifications `PENDING`/`FAILED` honestly

- [ ] **common-library: `GlobalExceptionHandler` returns a raw `Map`, not `ApiResponse`**
  - Error responses are a plain JSON `Map` `{ timestamp, status, message }`, so a failed request
    and a successful `ApiResponse`-wrapped request do not share the same shape
  - Consider returning `ApiResponse.error(...)` for a consistent error contract

- [ ] **course-enrollment-service: cancellation is a hard delete**
  - `cancelEnrollment(id)` hard-deletes the row instead of a soft `status = CANCELLED` update, so
    enrollment history is not preserved. `CANCELLED` exists as a status value but is never written

- [ ] **course-enrollment-service: `deleteClass` has no active-enrollment guard**
  - `deleteClass` performs an unconditional hard delete; because `ENROLLMENTS.CLASS_ID` has an FK
    to `CLASSES`, deleting a class that still has enrollments fails at the DB level rather than
    returning a friendly `400`. Add an active-enrollment check before delete

---

## Phase 6 — Fees & Payments

- [ ] **Make Payment screen (Student/Parent)**
  - A form to initiate a payment for a fee cycle
  - Currently `FeesPage` shows balances but has no "Pay Now" action
  - Backend: payment gateway abstraction layer (`PaymentGatewayPort` interface + stub adapter)

- [ ] **Receipt screen (Student/Parent)**
  - `ReceiptsPage.tsx` exists in the file tree but needs to be verified as fully implemented
  - `GET /payments/{id}/receipt` — generate a printable receipt

- [ ] **Refund / adjustment workflow (Principal)**
  - `POST /payments/refunds`, `POST /fees/adjustments`
  - Frontend: Refunds/Adjustments page in Principal > Finance

- [ ] **Fee Plans management (Principal)**
  - Currently fees are derived directly from `Course.monthlyFee`; there is no `FeePlan` entity
  - Add `FeePlan` entity (discount rules, siblings discount, admission waiver, etc.)
  - Frontend: Fee Plans CRUD page in Principal > Finance

- [ ] **Overdue fee status**
  - Fee cycles past their due date that remain UNPAID should automatically transition to OVERDUE
  - Add scheduled job in payment-service or derive status from `due_date < today AND status = UNPAID`

- [ ] **Payment notification to student/parent on fee generation**
  - notification-service already sends a fee reminder on `fee-generated` event, but the email template is minimal; add due date and itemised course breakdown

- [ ] **Invoice PDF generation**
  - `GET /fees/{cycleId}/invoice` returning a PDF
  - Backend: PDF generation library (e.g. iText or OpenPDF)

---

## Phase 7 — Mobile / PWA & Notifications

- [ ] **Notification bell / inbox (all roles)**
  - Frontend: Notifications page per role (Student, Teacher, Principal)
  - Show unread count badge on sidebar icon
  - `GET /notifications?userId=...` is implemented in notification-service; wire it to the UI

- [ ] **Push notification abstraction**
  - notification-service currently only sends email; add a `PushNotificationPort` interface
  - Integrate with a provider (Firebase FCM or web push) for in-browser notifications

- [ ] **PWA configuration**
  - Add `manifest.json` and a service worker to the React app
  - Enables "Add to Home Screen" on mobile browsers

- [ ] **Responsive / mobile UX audit**
  - Test all pages at 375 px (mobile) and 768 px (tablet) breakpoints
  - Fix layout issues in DataTable-heavy pages (Enrollments, Attendance, Finance)

- [ ] **Offline-friendly timetable**
  - Service worker caches the student/teacher timetable for offline viewing

- [ ] **Announcement notifications**
  - Principal can send a broadcast announcement to all students / teachers
  - Backend: `POST /notifications/broadcast` (PRINCIPAL only)
  - Frontend: Announcements management page in Principal > Administration

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

## Cross-cutting / Smaller Items

- [ ] **`notificationSlice` wired to backend**
  - Redux slice exists but no Notifications page is rendered for any role in the current routing

- [ ] **`ReceiptsPage` verified**
  - File exists; confirm it is reachable via routing and renders real data from `GET /payments?studentId=...`

- [ ] **Attendance service: `ATTENDANCE_UPDATED` topic consumer**
  - `KafkaTopics.ATTENDANCE_UPDATED` is defined but no producer in attendance-service publishes to it, and reporting-service has a consumer wired to it — implement the update/correction flow to fire this event

- [ ] **Redis usage**
  - Redis container is running in docker-compose but no service currently uses it
  - Candidates: JWT refresh token blacklist in auth-service, rate-limiting cache, session cache

- [ ] **Class Notes / Remarks (Teacher)**
  - Spec lists "Class Notes/Remarks" under Teacher > Teaching; no backend entity or UI exists

- [ ] **Student Profile edit (Student role)**
  - `StudentProfilePage` exists; verify the student can update their own contact details and profile photo via `PUT /students/{id}`
