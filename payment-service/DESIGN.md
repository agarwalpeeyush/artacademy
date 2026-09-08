# Payment Service — Detail Design Document

## 1. Overview

The `payment-service` owns the academy's financial lifecycle: monthly **fee-cycle generation** (one cycle per student per billing month, with a per-enrollment detail line), **payment recording** with **FIFO allocation** across the outstanding detail lines, and **revenue reporting** (defaulters, revenue summary). It keeps a local **`ENROLLMENT_CACHE`** — a mirror of active enrollments built by consuming enrollment events — so fee generation never has to call other services at request time.

It publishes `FeeGeneratedEvent`, `PaymentReceivedEvent`, and `FeeStatusUpdatedEvent` so the reporting and notification services can react asynchronously.

> **Note (documented as-implemented):** unlike every other business service, `payment-service` controllers return **raw DTOs** (e.g. `List<FeeCycleResponse>`, `PaymentResponse`) — they are **not** wrapped in the shared `ApiResponse<T>` envelope.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `payment-service` |
| Package root | `com.artacademy.payment` |
| Server port | **8086** local/dev · **8086** Docker container (host-mapped `8086:8086`) |
| Database | `payment_db` (PostgreSQL on `localhost:15432` local, `postgres:5432` Docker) |

---

## 3. Component Structure

```
com.artacademy.payment
├── PaymentServiceApplication.java
├── config
│   ├── SecurityConfig.java
│   ├── KafkaProducerConfig.java
│   └── KafkaConsumerConfig.java
├── controller
│   ├── FeeController.java
│   └── PaymentController.java
├── domain
│   ├── FeeStatus.java              (enum)
│   ├── EnrollmentCache.java
│   ├── StudentFeeCycle.java
│   ├── StudentFeeDetail.java
│   ├── Payment.java
│   └── PaymentAllocation.java
├── dto
│   ├── GenerateFeesRequest.java
│   ├── FeeCycleResponse.java
│   ├── FeeDetailResponse.java
│   ├── PaymentRequest.java / PaymentResponse.java
│   ├── PaymentAllocationRequest.java / PaymentAllocationResponse.java
│   └── RevenueSummaryResponse.java
├── kafka
│   └── EnrollmentEventConsumer.java
├── mapper
│   └── PaymentMapper.java          (MapStruct)
├── repository
│   ├── EnrollmentCacheRepository.java
│   ├── StudentFeeCycleRepository.java
│   ├── StudentFeeDetailRepository.java
│   ├── PaymentRepository.java
│   └── PaymentAllocationRepository.java
└── service
    ├── FeeService.java
    ├── PaymentService.java
    └── ScheduledFeeGenerationService.java
```

---

## 4. Domain Model

### 4.1 `FeeStatus` (enum)

```
PAID, PARTIAL, UNPAID
```

Shared by `StudentFeeCycle.status` and `StudentFeeDetail.status`.

### 4.2 `EnrollmentCache` (table `ENROLLMENT_CACHE`)

Local mirror of active enrollments, keyed by the enrollment UUID and maintained purely from Kafka events.

```
UUID        enrollmentId   (PK — the enrollment's UUID from course-enrollment-service)
UUID        studentId      (not null)
UUID        courseId       (not null)
BigDecimal  courseFee      (NUMERIC(12,2), not null; defaults to 0)
String      status         (not null, max 20 — ACTIVE | CANCELLED)
```

> **Note (documented as-implemented):** `EnrollmentCreatedEvent` does **not** carry a course fee, so a newly-cached enrollment gets `courseFee = 0`. Fee-cycle totals therefore come out as **0** for enrollments cached from live events (there is no separate fee-update event wired up yet). The V3 seed rows carry real fees (2500 / 3000) so the seeded end-to-end flow shows non-zero amounts.

### 4.3 `StudentFeeCycle` (table `STUDENT_FEE_CYCLES`)

One row per student per billing month/year.

```
UUID                id
UUID                studentId          (not null)
Integer             billingMonth       (not null; 1–12)
Integer             billingYear        (not null; ≥ 2000)
BigDecimal          totalAmount        (NUMERIC(12,2), not null)
BigDecimal          paidAmount         (NUMERIC(12,2), not null; default 0)
BigDecimal          outstandingAmount  (NUMERIC(12,2), not null)
FeeStatus           status             (STRING, not null, max 20)
LocalDateTime       generatedDate
LocalDateTime       dueDate
List<StudentFeeDetail> details          (OneToMany, cascade ALL, orphanRemoval)

UNIQUE (studentId, billingMonth, billingYear)
```

### 4.4 `StudentFeeDetail` (table `STUDENT_FEE_DETAILS`)

One row per enrollment per fee cycle — a single course's charge within the month.

```
UUID            id
StudentFeeCycle feeCycle              (ManyToOne LAZY; FK FEE_CYCLE_ID, not null)
UUID            studentId             (not null)
UUID            enrollmentId          (not null)
UUID            courseId              (not null)
BigDecimal      courseFee             (NUMERIC(12,2), not null)
BigDecimal      allocatedPaidAmount   (NUMERIC(12,2), not null; default 0)
BigDecimal      outstandingAmount     (NUMERIC(12,2), not null)
FeeStatus       status                (STRING, not null, max 20)

UNIQUE (feeCycleId, enrollmentId)
```

### 4.5 `Payment` (table `PAYMENTS`)

A single payment transaction against one fee cycle.

```
UUID                    id
StudentFeeCycle         feeCycle              (ManyToOne LAZY; FK FEE_CYCLE_ID, not null)
UUID                    studentId             (not null)
BigDecimal              amount                (NUMERIC(12,2), not null; CHECK > 0)
String                  paymentMode           (not null, max 50 — e.g. UPI, CASH, CARD)
String                  transactionReference  (max 200, nullable)
LocalDateTime           paymentDate           (stamped server-side = now())
String                  remarks               (TEXT, nullable)
List<PaymentAllocation> allocations           (OneToMany, cascade ALL, orphanRemoval)
```

### 4.6 `PaymentAllocation` (table `PAYMENT_ALLOCATIONS`)

How a single payment is split across the fee-detail lines it settles.

```
UUID             id
Payment          payment          (ManyToOne LAZY; FK PAYMENT_ID, not null)
StudentFeeDetail feeDetail        (ManyToOne LAZY; FK FEE_DETAIL_ID, not null)
BigDecimal       allocatedAmount  (NUMERIC(12,2), not null; CHECK > 0)
```

---

## 5. Database Schema

Managed by Flyway. Final state after V2 (V3 seeds data only):

```sql
CREATE TABLE ENROLLMENT_CACHE (
    ENROLLMENT_ID  UUID           NOT NULL,
    STUDENT_ID     UUID           NOT NULL,
    COURSE_ID      UUID           NOT NULL,
    COURSE_FEE     NUMERIC(12,2)  NOT NULL DEFAULT 0,
    STATUS         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT pk_enrollment_cache PRIMARY KEY (ENROLLMENT_ID),
    CONSTRAINT chk_enrollment_cache_status CHECK (STATUS IN ('ACTIVE','CANCELLED'))
);
CREATE INDEX idx_enrollment_cache_student_id ON ENROLLMENT_CACHE(STUDENT_ID);
CREATE INDEX idx_enrollment_cache_status     ON ENROLLMENT_CACHE(STATUS);

CREATE TABLE STUDENT_FEE_CYCLES (
    ID                 UUID           NOT NULL,
    STUDENT_ID         UUID           NOT NULL,
    BILLING_MONTH      INT            NOT NULL,
    BILLING_YEAR       INT            NOT NULL,
    TOTAL_AMOUNT       NUMERIC(12,2)  NOT NULL,
    PAID_AMOUNT        NUMERIC(12,2)  NOT NULL DEFAULT 0,
    OUTSTANDING_AMOUNT NUMERIC(12,2)  NOT NULL,
    STATUS             VARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    GENERATED_DATE     TIMESTAMP,
    DUE_DATE           TIMESTAMP,
    CONSTRAINT pk_student_fee_cycles PRIMARY KEY (ID),
    CONSTRAINT uq_student_fee_cycles_student_month_year UNIQUE (STUDENT_ID, BILLING_MONTH, BILLING_YEAR),
    CONSTRAINT chk_student_fee_cycles_status CHECK (STATUS IN ('PAID','PARTIAL','UNPAID')),
    CONSTRAINT chk_student_fee_cycles_billing_month CHECK (BILLING_MONTH BETWEEN 1 AND 12),
    CONSTRAINT chk_student_fee_cycles_billing_year CHECK (BILLING_YEAR >= 2000)
);
CREATE INDEX idx_student_fee_cycles_student_id     ON STUDENT_FEE_CYCLES(STUDENT_ID);
CREATE INDEX idx_student_fee_cycles_status         ON STUDENT_FEE_CYCLES(STATUS);
CREATE INDEX idx_student_fee_cycles_student_status ON STUDENT_FEE_CYCLES(STUDENT_ID, STATUS);

CREATE TABLE STUDENT_FEE_DETAILS (
    ID                    UUID           NOT NULL,
    FEE_CYCLE_ID          UUID           NOT NULL,
    STUDENT_ID            UUID           NOT NULL,
    ENROLLMENT_ID         UUID           NOT NULL,
    COURSE_ID             UUID           NOT NULL,
    COURSE_FEE            NUMERIC(12,2)  NOT NULL,
    ALLOCATED_PAID_AMOUNT NUMERIC(12,2)  NOT NULL DEFAULT 0,
    OUTSTANDING_AMOUNT    NUMERIC(12,2)  NOT NULL,
    STATUS                VARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    CONSTRAINT pk_student_fee_details PRIMARY KEY (ID),
    CONSTRAINT fk_student_fee_details_cycle
        FOREIGN KEY (FEE_CYCLE_ID) REFERENCES STUDENT_FEE_CYCLES(ID) ON DELETE CASCADE,
    CONSTRAINT uq_student_fee_details_cycle_enrollment UNIQUE (FEE_CYCLE_ID, ENROLLMENT_ID),
    CONSTRAINT chk_student_fee_details_status CHECK (STATUS IN ('PAID','PARTIAL','UNPAID'))
);
CREATE INDEX idx_student_fee_details_fee_cycle_id  ON STUDENT_FEE_DETAILS(FEE_CYCLE_ID);
CREATE INDEX idx_student_fee_details_student_id    ON STUDENT_FEE_DETAILS(STUDENT_ID);
CREATE INDEX idx_student_fee_details_enrollment_id ON STUDENT_FEE_DETAILS(ENROLLMENT_ID);

CREATE TABLE PAYMENTS (
    ID                    UUID           NOT NULL,
    FEE_CYCLE_ID          UUID           NOT NULL,
    STUDENT_ID            UUID           NOT NULL,
    AMOUNT                NUMERIC(12,2)  NOT NULL,
    PAYMENT_MODE          VARCHAR(50)    NOT NULL,
    TRANSACTION_REFERENCE VARCHAR(200),
    PAYMENT_DATE          TIMESTAMP,
    REMARKS               TEXT,
    CONSTRAINT pk_payments PRIMARY KEY (ID),
    CONSTRAINT fk_payments_fee_cycle FOREIGN KEY (FEE_CYCLE_ID) REFERENCES STUDENT_FEE_CYCLES(ID),
    CONSTRAINT chk_payments_amount CHECK (AMOUNT > 0)
);
CREATE INDEX idx_payments_student_id   ON PAYMENTS(STUDENT_ID);
CREATE INDEX idx_payments_fee_cycle_id ON PAYMENTS(FEE_CYCLE_ID);

CREATE TABLE PAYMENT_ALLOCATIONS (
    ID               UUID           NOT NULL,
    PAYMENT_ID       UUID           NOT NULL,
    FEE_DETAIL_ID    UUID           NOT NULL,
    ALLOCATED_AMOUNT NUMERIC(12,2)  NOT NULL,
    CONSTRAINT pk_payment_allocations PRIMARY KEY (ID),
    CONSTRAINT fk_payment_allocations_payment
        FOREIGN KEY (PAYMENT_ID) REFERENCES PAYMENTS(ID) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocations_fee_detail
        FOREIGN KEY (FEE_DETAIL_ID) REFERENCES STUDENT_FEE_DETAILS(ID),
    CONSTRAINT chk_payment_allocations_allocated_amount CHECK (ALLOCATED_AMOUNT > 0)
);
CREATE INDEX idx_payment_allocations_payment_id    ON PAYMENT_ALLOCATIONS(PAYMENT_ID);
CREATE INDEX idx_payment_allocations_fee_detail_id ON PAYMENT_ALLOCATIONS(FEE_DETAIL_ID);
```

`ddl-auto: validate` — the schema must match the JPA entities exactly.

---

## 6. REST API

Responses are **raw DTOs**, **not** wrapped in `ApiResponse<T>` (see §1 note).

### 6.1 Fees — base `/fees`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/fees/generate` | PRINCIPAL | Generate monthly fee cycles for all active students (`201`; returns `List<FeeCycleResponse>`) |
| `GET` | `/fees/student/{studentId}` | PRINCIPAL, TEACHER, STUDENT | All fee cycles for a student |
| `GET` | `/fees/student/{studentId}/courses` | PRINCIPAL, TEACHER, STUDENT | Fee **detail** lines (per course) for a student (`List<FeeDetailResponse>`) |
| `GET` | `/fees/cycle/{feeCycleId}` | PRINCIPAL, TEACHER, STUDENT | One fee cycle with its details |
| `GET` | `/fees/outstanding/{studentId}` | PRINCIPAL, TEACHER, STUDENT | Cycles in `UNPAID` or `PARTIAL` state for a student |
| `GET` | `/fees/defaulters` | PRINCIPAL | All `UNPAID` + `PARTIAL` cycles across every student |
| `GET` | `/fees/revenue-summary` | PRINCIPAL | Revenue grouped by billing year/month (`List<RevenueSummaryResponse>`) |

#### `POST /fees/generate` — Request Body (`GenerateFeesRequest`)

```json
{
  "billingMonth": 8,
  "billingYear": 2026
}
```

`billingMonth` 1–12, `billingYear` ≥ 2000 (bean-validated).

### 6.2 Payments — base `/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/payments` | PRINCIPAL, TEACHER | Record a payment against a fee cycle (`201`; returns `PaymentResponse`) |
| `GET` | `/payments/student/{studentId}` | PRINCIPAL, TEACHER, STUDENT | All payments for a student (with allocations) |

#### `POST /payments` — Request Body (`PaymentRequest`)

```json
{
  "feeCycleId": "<UUID>",
  "studentId": "<UUID>",
  "amount": 5500.00,
  "paymentMode": "UPI",
  "transactionReference": "TXN-0001",
  "remarks": "August fees"
}
```

`amount` must be ≥ 0.01; `paymentMode` is required. **There is no `paymentDate` field** — the payment date is stamped server-side as `now()`.

---

## 7. Service Logic

### `FeeService`

| Method | Logic |
|--------|-------|
| `generateMonthlyFees(month, year)` | Load `ENROLLMENT_CACHE` rows with `status = ACTIVE`; if none, return empty list. Group by `studentId`. Per student: **if a cycle already exists** for `(studentId, month, year)`, add the **existing** cycle to the result and continue (idempotent — returns the existing cycle, does not error or skip silently). Otherwise `totalAmount = Σ courseFee`, create a `STUDENT_FEE_CYCLE` (`UNPAID`, `paidAmount = 0`, `outstanding = total`, `generatedDate = now()`, `dueDate = last day of month at 23:59:59`), create one `STUDENT_FEE_DETAIL` per enrollment (`UNPAID`), publish `FeeGeneratedEvent`. |
| `getFeeCycles(studentId)` | All cycles for a student |
| `getFeeCycleDetails(feeCycleId)` | Load cycle (`EntityNotFoundException` if missing) + its details |
| `getFeeDetails(studentId)` | All fee-detail lines for a student |
| `getOutstanding(studentId)` | Cycles for a student in `UNPAID` or `PARTIAL` |
| `getDefaulters()` | **All** `UNPAID` + `PARTIAL` cycles across all students |
| `getRevenueSummary()` | Group all cycles by `year-month`, summing **`paidAmount`** into `totalPaid`; sorted by key ascending |

### `PaymentService`

| Method | Logic |
|--------|-------|
| `recordPayment(request)` | Load cycle (`EntityNotFoundException` if missing). Create `Payment` (`paymentDate = now()`). Fetch the cycle's details, **filter out `PAID`**, sort by `courseId` ascending, and allocate the payment **FIFO**: for each detail take `min(remaining, detailOutstanding)`, create a `PaymentAllocation`, bump `allocatedPaidAmount`, reduce `outstandingAmount`, set the detail to `PAID` (outstanding hits 0) or `PARTIAL`. Recalculate the cycle: `paidAmount = Σ allocatedPaidAmount`, `outstanding = total − paid`, and `status` = `PAID` (all details PAID) / `PARTIAL` / `UNPAID`. Publish `PaymentReceivedEvent` then `FeeStatusUpdatedEvent`. |
| `getPayments(studentId)` | All payments for a student, each with its allocations |

> **Note (documented as-implemented):** if the paid `amount` exceeds the cycle's total outstanding, the surplus **cannot** be allocated (all details are settled first). The service logs a warning `"Allocation mismatch … Possible overpayment"` but still persists the full `Payment.amount`; the un-allocated surplus is **not** tracked as a credit or refund anywhere. The cycle's `paidAmount` is recomputed from allocations, so it will not exceed `totalAmount`.

### `ScheduledFeeGenerationService`

A `@Scheduled(cron = "0 0 1 * * *")` job (00:00 on the 1st of every month) that calls `feeService.generateMonthlyFees(currentMonth, currentYear)`. Errors are caught and logged; a failure does not crash the scheduler.

---

## 8. Kafka

Topic names use **hyphens** (see `common-library/events/KafkaTopics.java`).

### 8.1 Consumed — `EnrollmentEventConsumer` (group `payment-service-group`)

| Topic | Action |
|-------|--------|
| `enrollment-created` | Upsert `ENROLLMENT_CACHE` by `enrollmentId`: set `studentId`, `courseId`, `status = ACTIVE`; default `courseFee = 0` when absent (the event carries no fee — see §4.2 note) |
| `enrollment-cancelled` | Find by `enrollmentId` and set `status = CANCELLED` (warns if the row is not found) |

### 8.2 Produced

| Topic | Event | When | Key |
|-------|-------|------|-----|
| `fee-generated` | `FeeGeneratedEvent` (`feeCycleId`, `studentId`, `billingMonth`, `billingYear`, `totalAmount`, `occurredAt`) | Per student, after a new cycle persists | `studentId` |
| `payment-received` | `PaymentReceivedEvent` (`paymentId`, `feeCycleId`, `studentId`, `amount`, `occurredAt`) | After a payment is recorded | `studentId` |
| `fee-status-updated` | `FeeStatusUpdatedEvent` (`feeCycleId`, `studentId`, `status`, `occurredAt`) | Immediately after `payment-received`, carrying the recomputed cycle status | `studentId` |

**Consumers:**
- `reporting-service` — `fee-generated` → `RevenueSummary.totalBilled/outstanding += totalAmount`, `studentCount += 1`, `StudentReport.activeFeeBalance += totalAmount`; `payment-received` → `totalCollected += amount`, `outstanding -= amount`, `StudentReport.activeFeeBalance -= amount` and `lastPaymentDate`. (`fee-status-updated` has **no** reporting consumer.)
- `notification-service` — sends an email on `fee-generated` ("Fee Generated") and on `payment-received` ("Payment Received").

---

## 9. Security Configuration

CSRF disabled; sessions `STATELESS`; method security enabled; `JwtAuthenticationFilter` (common-library) before `UsernamePasswordAuthenticationFilter`. Public: `/actuator/**`, `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`.

Authorization (HttpSecurity matchers + `@PreAuthorize` on controllers, kept in sync):
- `POST /fees/generate`, `GET /fees/defaulters`, `GET /fees/revenue-summary` → **PRINCIPAL**.
- `GET /fees/student/**`, `GET /payments/student/**` → **STUDENT, TEACHER, PRINCIPAL**.
- Other `GET /fees/**` (`/cycle/{id}`, `/outstanding/{id}`, `/student/{id}/courses`) → **TEACHER, PRINCIPAL** at the HttpSecurity layer, further widened to include STUDENT by the `@PreAuthorize` on the student-scoped ones.
- `POST /payments` → **PRINCIPAL, TEACHER**; other `GET /payments/**` → **TEACHER, PRINCIPAL**.

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema (BIGSERIAL / BIGINT IDs) with the five tables, FKs, check constraints, and indexes |
| V2 | Drop/recreate all tables with UUID primary keys; UPPERCASE names; FK + unique + check constraints + indexes retained |
| V3 | Seed idempotent sample data (`ON CONFLICT DO NOTHING`) with fixed UUIDs matching the other services: enrollment-cache rows, one fully-PAID cycle (student1, ₹5500) and one UNPAID cycle (student2, ₹2500), fee details, a seed payment, and its allocations; local/testing only |
