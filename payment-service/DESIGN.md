# Payment Service — Detail Design Document

## 1. Overview

The Payment Service owns fee billing and payment collection for the Art Academy
platform. It generates a **monthly fee cycle** per student by grouping that
student's active course enrollments, records **payments** against a cycle,
allocates each payment across the cycle's outstanding course fees using a
**FIFO** rule, and produces a downloadable **PDF receipt**.

The service keeps a local **enrollment cache** that it maintains by consuming
enrollment events from the enrollment service (event-carried state transfer), so
it never has to call other services synchronously during fee generation. It
publishes domain events (`fee-generated`, `payment-received`,
`fee-status-updated`) for downstream consumers such as notifications and
reporting.

Key capabilities:

- Generate monthly fee cycles for all active students (manual `POST` or a
  scheduled monthly job).
- Query fee cycles, per-course fee details, and outstanding balances per student.
- Record payments and auto-allocate them FIFO across course fee details.
- Derive cycle status (`UNPAID` → `PARTIAL` → `PAID`) and a read-only
  `OVERDUE` display flag.
- Principal reporting: defaulters and revenue summary.
- PDF receipt download per payment.

## 2. Module Coordinates

| Property | Value |
|---|---|
| Module | `payment-service` |
| Package root | `com.artacademy.payment` |
| HTTP port | `8086` |
| Database | `payment_db` (PostgreSQL) |
| JDBC (dev) | `jdbc:postgresql://localhost:15432/payment_db` |
| Config source | Config Server at `http://localhost:8888` (`payment-service.yml`) |
| Migrations | Flyway — `classpath:db/migration` (+ `classpath:db/seed` under `docker` profile) |
| `ddl-auto` | `validate` (schema owned by Flyway) |
| Spring Boot | 3.3.4 |
| Java | 21 |
| Framework stack | Spring Web, Spring Data JPA, Spring Security (JWT), Spring Kafka, MapStruct, Lombok, OpenPDF |

Security is stateless JWT (`JwtAuthenticationFilter` from `common-library`) with
method-level `@PreAuthorize` and URL rules in `SecurityConfig`. Actuator and
Swagger endpoints are public.

## 3. Component Structure

Package tree (actual files under `src/main/java/com/artacademy/payment`):

```
com.artacademy.payment
├── PaymentServiceApplication.java
├── config
│   ├── KafkaConsumerConfig.java
│   ├── KafkaProducerConfig.java
│   └── SecurityConfig.java
├── controller
│   ├── FeeController.java          # /fees
│   └── PaymentController.java      # /payments
├── domain
│   ├── EnrollmentCache.java        # ENROLLMENT_CACHE
│   ├── StudentFeeCycle.java        # STUDENT_FEE_CYCLES
│   ├── StudentFeeDetail.java       # STUDENT_FEE_DETAILS
│   ├── Payment.java                # PAYMENTS
│   ├── PaymentAllocation.java      # PAYMENT_ALLOCATIONS
│   └── FeeStatus.java              # enum PAID / PARTIAL / UNPAID
├── dto
│   ├── GenerateFeesRequest.java
│   ├── PaymentRequest.java
│   ├── PaymentAllocationRequest.java
│   ├── FeeCycleResponse.java
│   ├── FeeDetailResponse.java
│   ├── PaymentResponse.java
│   ├── PaymentAllocationResponse.java
│   └── RevenueSummaryResponse.java
├── kafka
│   └── EnrollmentEventConsumer.java   # consumes enrollment-created / -cancelled
├── mapper
│   └── PaymentMapper.java             # MapStruct
├── repository
│   ├── EnrollmentCacheRepository.java
│   ├── StudentFeeCycleRepository.java
│   ├── StudentFeeDetailRepository.java
│   ├── PaymentRepository.java
│   └── PaymentAllocationRepository.java
└── service
    ├── FeeService.java                 # fee-cycle generation + queries
    ├── PaymentService.java             # payment recording + FIFO allocation
    ├── ReceiptService.java             # PDF receipt (OpenPDF)
    └── ScheduledFeeGenerationService.java  # monthly cron
```

## 4. Domain Model

Five JPA entities plus one enum.

### `FeeStatus` (enum)

`PAID`, `PARTIAL`, `UNPAID`. Persisted as `EnumType.STRING` on both
`StudentFeeCycle` and `StudentFeeDetail`. (`OVERDUE` is **not** a persisted
value — it is a derived display flag only; see §7.)

### `EnrollmentCache` (`ENROLLMENT_CACHE`)

A read-model of enrollments, maintained from Kafka events.

| Field | Column | Type | Notes |
|---|---|---|---|
| `enrollmentId` | `ENROLLMENT_ID` | UUID | **PK** (assigned, from source event) |
| `studentId` | `STUDENT_ID` | UUID | not null |
| `courseId` | `COURSE_ID` | UUID | not null |
| `courseFee` | `COURSE_FEE` | NUMERIC(12,2) | not null |
| `status` | `STATUS` | VARCHAR(20) | `ACTIVE` / `CANCELLED` (plain string) |

### `StudentFeeCycle` (`STUDENT_FEE_CYCLES`)

One billing cycle per student per month/year.

| Field | Column | Type | Notes |
|---|---|---|---|
| `id` | `ID` | UUID | PK, generated |
| `studentId` | `STUDENT_ID` | UUID | not null |
| `billingMonth` | `BILLING_MONTH` | INTEGER | not null (1–12) |
| `billingYear` | `BILLING_YEAR` | INTEGER | not null |
| `totalAmount` | `TOTAL_AMOUNT` | NUMERIC(12,2) | not null |
| `paidAmount` | `PAID_AMOUNT` | NUMERIC(12,2) | not null, default 0 |
| `outstandingAmount` | `OUTSTANDING_AMOUNT` | NUMERIC(12,2) | not null |
| `status` | `STATUS` | VARCHAR(20) | `FeeStatus` (enum string) |
| `generatedDate` | `GENERATED_DATE` | TIMESTAMP | nullable |
| `dueDate` | `DUE_DATE` | TIMESTAMP | nullable |
| `details` | — | — | `@OneToMany` → `StudentFeeDetail` (cascade all, orphan removal) |

Unique constraint: `(STUDENT_ID, BILLING_MONTH, BILLING_YEAR)`.

### `StudentFeeDetail` (`STUDENT_FEE_DETAILS`)

Per-course line item within a fee cycle (one per active enrollment).

| Field | Column | Type | Notes |
|---|---|---|---|
| `id` | `ID` | UUID | PK, generated |
| `feeCycle` | `FEE_CYCLE_ID` | UUID | FK → `STUDENT_FEE_CYCLES.ID`, not null |
| `studentId` | `STUDENT_ID` | UUID | not null |
| `enrollmentId` | `ENROLLMENT_ID` | UUID | not null |
| `courseId` | `COURSE_ID` | UUID | not null |
| `courseFee` | `COURSE_FEE` | NUMERIC(12,2) | not null |
| `allocatedPaidAmount` | `ALLOCATED_PAID_AMOUNT` | NUMERIC(12,2) | not null, default 0 |
| `outstandingAmount` | `OUTSTANDING_AMOUNT` | NUMERIC(12,2) | not null |
| `status` | `STATUS` | VARCHAR(20) | `FeeStatus` (enum string) |

Unique constraint: `(FEE_CYCLE_ID, ENROLLMENT_ID)`.

### `Payment` (`PAYMENTS`)

A single payment recorded against a fee cycle.

| Field | Column | Type | Notes |
|---|---|---|---|
| `id` | `ID` | UUID | PK, generated |
| `feeCycle` | `FEE_CYCLE_ID` | UUID | FK → `STUDENT_FEE_CYCLES.ID`, not null |
| `studentId` | `STUDENT_ID` | UUID | not null |
| `amount` | `AMOUNT` | NUMERIC(12,2) | not null |
| `paymentMode` | `PAYMENT_MODE` | VARCHAR(50) | not null (free text, e.g. `UPI`, `CASH`, `CARD`) |
| `transactionReference` | `TRANSACTION_REFERENCE` | VARCHAR(200) | nullable |
| `paymentDate` | `PAYMENT_DATE` | TIMESTAMP | nullable (defaults to now) |
| `remarks` | `REMARKS` | TEXT | nullable |
| `allocations` | — | — | `@OneToMany` → `PaymentAllocation` (cascade all, orphan removal) |

### `PaymentAllocation` (`PAYMENT_ALLOCATIONS`)

Links how much of a payment was applied to a specific fee detail.

| Field | Column | Type | Notes |
|---|---|---|---|
| `id` | `ID` | UUID | PK, generated |
| `payment` | `PAYMENT_ID` | UUID | FK → `PAYMENTS.ID`, not null |
| `feeDetail` | `FEE_DETAIL_ID` | UUID | FK → `STUDENT_FEE_DETAILS.ID`, not null |
| `allocatedAmount` | `ALLOCATED_AMOUNT` | NUMERIC(12,2) | not null |

## 5. Database Schema

Verbatim `V1__init_payment_schema.sql`. Note: status columns are plain
`VARCHAR(20)` — there are **no `CHECK` constraints**; allowed values are enforced
in the JPA layer via `FeeStatus`.

```sql
-- Payment service schema (payment_db).

CREATE TABLE ENROLLMENT_CACHE (
    ENROLLMENT_ID UUID PRIMARY KEY,
    STUDENT_ID    UUID NOT NULL,
    COURSE_ID     UUID NOT NULL,
    COURSE_FEE    NUMERIC(12, 2) NOT NULL,
    STATUS        VARCHAR(20) NOT NULL
);

CREATE INDEX idx_enrollment_cache_student_id ON ENROLLMENT_CACHE (STUDENT_ID);
CREATE INDEX idx_enrollment_cache_status ON ENROLLMENT_CACHE (STATUS);

CREATE TABLE STUDENT_FEE_CYCLES (
    ID                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    STUDENT_ID         UUID NOT NULL,
    BILLING_MONTH      INTEGER NOT NULL,
    BILLING_YEAR       INTEGER NOT NULL,
    TOTAL_AMOUNT       NUMERIC(12, 2) NOT NULL,
    PAID_AMOUNT        NUMERIC(12, 2) NOT NULL,
    OUTSTANDING_AMOUNT NUMERIC(12, 2) NOT NULL,
    STATUS             VARCHAR(20) NOT NULL,
    GENERATED_DATE     TIMESTAMP,
    DUE_DATE           TIMESTAMP,
    CONSTRAINT uq_student_fee_cycles_student_month_year UNIQUE (STUDENT_ID, BILLING_MONTH, BILLING_YEAR)
);

CREATE INDEX idx_fee_cycles_student_id ON STUDENT_FEE_CYCLES (STUDENT_ID);
CREATE INDEX idx_fee_cycles_status ON STUDENT_FEE_CYCLES (STATUS);
CREATE INDEX idx_fee_cycles_student_status ON STUDENT_FEE_CYCLES (STUDENT_ID, STATUS);

CREATE TABLE STUDENT_FEE_DETAILS (
    ID                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    FEE_CYCLE_ID          UUID NOT NULL,
    STUDENT_ID            UUID NOT NULL,
    ENROLLMENT_ID         UUID NOT NULL,
    COURSE_ID             UUID NOT NULL,
    COURSE_FEE            NUMERIC(12, 2) NOT NULL,
    ALLOCATED_PAID_AMOUNT NUMERIC(12, 2) NOT NULL,
    OUTSTANDING_AMOUNT    NUMERIC(12, 2) NOT NULL,
    STATUS                VARCHAR(20) NOT NULL,
    CONSTRAINT uq_student_fee_details_cycle_enrollment UNIQUE (FEE_CYCLE_ID, ENROLLMENT_ID),
    CONSTRAINT fk_fee_details_cycle FOREIGN KEY (FEE_CYCLE_ID) REFERENCES STUDENT_FEE_CYCLES (ID) ON DELETE CASCADE
);

CREATE INDEX idx_fee_details_cycle_id ON STUDENT_FEE_DETAILS (FEE_CYCLE_ID);
CREATE INDEX idx_fee_details_student_id ON STUDENT_FEE_DETAILS (STUDENT_ID);

CREATE TABLE PAYMENTS (
    ID                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    FEE_CYCLE_ID          UUID NOT NULL,
    STUDENT_ID            UUID NOT NULL,
    AMOUNT                NUMERIC(12, 2) NOT NULL,
    PAYMENT_MODE          VARCHAR(50) NOT NULL,
    TRANSACTION_REFERENCE VARCHAR(200),
    PAYMENT_DATE          TIMESTAMP,
    REMARKS               TEXT,
    CONSTRAINT fk_payments_cycle FOREIGN KEY (FEE_CYCLE_ID) REFERENCES STUDENT_FEE_CYCLES (ID)
);

CREATE INDEX idx_payments_cycle_id ON PAYMENTS (FEE_CYCLE_ID);
CREATE INDEX idx_payments_student_id ON PAYMENTS (STUDENT_ID);

CREATE TABLE PAYMENT_ALLOCATIONS (
    ID               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PAYMENT_ID       UUID NOT NULL,
    FEE_DETAIL_ID    UUID NOT NULL,
    ALLOCATED_AMOUNT NUMERIC(12, 2) NOT NULL,
    CONSTRAINT fk_allocations_payment FOREIGN KEY (PAYMENT_ID) REFERENCES PAYMENTS (ID) ON DELETE CASCADE,
    CONSTRAINT fk_allocations_fee_detail FOREIGN KEY (FEE_DETAIL_ID) REFERENCES STUDENT_FEE_DETAILS (ID)
);

CREATE INDEX idx_allocations_payment_id ON PAYMENT_ALLOCATIONS (PAYMENT_ID);
CREATE INDEX idx_allocations_fee_detail_id ON PAYMENT_ALLOCATIONS (FEE_DETAIL_ID);
```

### Constraint summary

| Kind | Definition |
|---|---|
| Unique | `STUDENT_FEE_CYCLES (STUDENT_ID, BILLING_MONTH, BILLING_YEAR)` |
| Unique | `STUDENT_FEE_DETAILS (FEE_CYCLE_ID, ENROLLMENT_ID)` |
| FK | `STUDENT_FEE_DETAILS.FEE_CYCLE_ID → STUDENT_FEE_CYCLES.ID` (ON DELETE CASCADE) |
| FK | `PAYMENTS.FEE_CYCLE_ID → STUDENT_FEE_CYCLES.ID` |
| FK | `PAYMENT_ALLOCATIONS.PAYMENT_ID → PAYMENTS.ID` (ON DELETE CASCADE) |
| FK | `PAYMENT_ALLOCATIONS.FEE_DETAIL_ID → STUDENT_FEE_DETAILS.ID` |
| CHECK | None — status validity enforced by the JPA `FeeStatus` enum |

## 6. REST API

Base URL: gateway `http://localhost:8080` or direct `http://localhost:8086`.
All endpoints require a Bearer JWT except actuator/swagger.

### `/fees`

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/fees/generate` | PRINCIPAL | Generate monthly fee cycles for all active students (returns 201) |
| GET | `/fees/student/{studentId}` | STUDENT, TEACHER, PRINCIPAL | All fee cycles for a student |
| GET | `/fees/student/{studentId}/courses` | STUDENT, TEACHER, PRINCIPAL | All per-course fee details for a student |
| GET | `/fees/cycle/{feeCycleId}` | STUDENT, TEACHER, PRINCIPAL | One fee cycle including its details |
| GET | `/fees/cycle/{feeCycleId}/details` | STUDENT, TEACHER, PRINCIPAL | Per-course details for a cycle |
| GET | `/fees/outstanding/{studentId}` | STUDENT, TEACHER, PRINCIPAL | UNPAID + PARTIAL cycles for a student |
| GET | `/fees/defaulters` | PRINCIPAL | All UNPAID + PARTIAL cycles (all students) |
| GET | `/fees/revenue-summary` | PRINCIPAL | Total paid grouped by year/month |

### `/payments`

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/payments` | PRINCIPAL, TEACHER | Record a payment against a fee cycle (returns 201) |
| GET | `/payments` | PRINCIPAL | All payments; optional `startDate` / `endDate` (`yyyy-MM-dd`) |
| GET | `/payments/student/{studentId}` | STUDENT, TEACHER, PRINCIPAL | All payments for a student |
| GET | `/payments/fee-cycle/{feeCycleId}` | STUDENT, TEACHER, PRINCIPAL | All payments for a fee cycle |
| GET | `/payments/{paymentId}` | STUDENT, TEACHER, PRINCIPAL | Single payment |
| GET | `/payments/{paymentId}/receipt` | STUDENT, TEACHER, PRINCIPAL | PDF receipt (`application/pdf`, attachment) |

### Request bodies

`POST /fees/generate` — `GenerateFeesRequest`:

```json
{
  "billingMonth": 9,
  "billingYear": 2026
}
```

Validation: `billingMonth` 1–12 (required); `billingYear` >= 2000 (required).

`POST /payments` — `PaymentRequest`:

```json
{
  "feeCycleId": "00000000-0000-0000-1301-000000000002",
  "studentId": "00000000-0000-0000-0003-000000000001",
  "amount": 5500.00,
  "paymentMode": "UPI",
  "transactionReference": "TXN-SEP-0001",
  "remarks": "September fees",
  "paymentDate": "2026-09-05"
}
```

Validation: `feeCycleId`, `studentId`, `amount` required; `amount` >= 0.01;
`paymentMode` not blank. `transactionReference`, `remarks`, `paymentDate`
optional — if `paymentDate` is omitted the server stamps the current time.

`PaymentResponse` includes the payment fields plus the generated `allocations`
(`feeDetailId`, `allocatedAmount`). `FeeCycleResponse` includes the persisted
amounts/status plus read-derived fields: `overdue`, `displayStatus`,
`excessAmount`, `shortAmount` (see §7).

## 7. Service Logic

### 7.1 Fee-cycle generation (`FeeService.generateMonthlyFees`)

1. Load all `ENROLLMENT_CACHE` rows with `status = 'ACTIVE'`. If none, return
   empty list.
2. Group active enrollments by `studentId`.
3. For each student:
   - If a cycle already exists for `(studentId, month, year)`, skip creation
     and return the existing cycle (idempotent — backed by the unique
     constraint).
   - Otherwise `totalAmount = Σ courseFee` of the student's active enrollments.
   - Create a `StudentFeeCycle` with `paidAmount = 0`,
     `outstandingAmount = totalAmount`, `status = UNPAID`,
     `generatedDate = now`, and `dueDate = last day of the billing month at
     23:59:59`.
   - Create one `StudentFeeDetail` per active enrollment
     (`allocatedPaidAmount = 0`, `outstanding = courseFee`, `status = UNPAID`).
   - Publish a `FeeGeneratedEvent` keyed by `studentId`.

Also invoked by `ScheduledFeeGenerationService` via cron `0 0 1 * * *`
(midnight on the 1st of each month) for the current month/year.

### 7.2 FIFO allocation (`PaymentService.recordPayment`)

1. Load the target `StudentFeeCycle` (404 via `EntityNotFoundException` if
   missing).
2. Persist a `Payment` (payment date = request date at start of day, else now).
3. Load the cycle's fee details, drop any already `PAID`, and sort them **FIFO
   by `courseId` ascending**.
4. Walk the sorted details applying `remaining` money greedily:
   `allocation = min(remaining, detail.outstanding)`; create a
   `PaymentAllocation`; increase `allocatedPaidAmount`, decrease
   `outstandingAmount`; set detail status to `PAID` when its outstanding hits
   0, else `PARTIAL`. Stop when `remaining <= 0`.
5. Sum allocations; if the sum differs from `amount` (overpayment or already
   fully settled), log a warning — the excess is not allocated.
6. Recalculate the cycle from **all** details: `paidAmount = Σ
   allocatedPaidAmount`, `outstandingAmount = totalAmount − paidAmount`.
7. Publish `PaymentReceivedEvent` then `FeeStatusUpdatedEvent`, both keyed by
   `studentId`.

### 7.3 Status derivation

Fee-detail status (per line): `PAID` when outstanding == 0, else `PARTIAL`
after any allocation.

Fee-cycle status (`recordPayment`):

- `PAID` — every detail is `PAID`.
- `PARTIAL` — some detail is beyond `UNPAID`, or `totalPaid > 0`.
- `UNPAID` — otherwise.

`OVERDUE` (read-only, `FeeService.decorate`): a cycle is decorated as overdue
when it is not fully `PAID` **and** its `dueDate` is in the past. This drives
`displayStatus` (`"OVERDUE"` vs the real status) and is **never** persisted.
`decorate` also computes `excessAmount` (`paid − total` when positive) and
`shortAmount` (`total − paid` when positive). Applied on the student cycle,
outstanding, and defaulters queries.

### 7.4 Revenue summary

`getRevenueSummary` loads every cycle, groups by `year-month`, sums
`paidAmount`, and returns `RevenueSummaryResponse` rows sorted by key.

### 7.5 PDF receipt (`ReceiptService.generateReceipt`)

Uses OpenPDF (`com.lowagie.text`). Renders an A4 receipt with an "Art Academy"
header, receipt metadata (receipt no. `RCP-<first 8 of id>`, payment date,
student id, billing period, mode, transaction ref), an allocation-breakdown
table (course id → allocated amount), the amount paid, and a fee-cycle summary
(total, paid, outstanding, excess/short, status). Amounts are formatted as
`INR <value>`. Returned as a `byte[]` with `Content-Disposition: attachment;
filename="receipt-<paymentId>.pdf"`.

## 8. Kafka

Topic constants: `common-library/.../events/KafkaTopics.java`.

### Consumers (`EnrollmentEventConsumer`) — maintain `ENROLLMENT_CACHE`

Consumer group: `payment-service-group` (default).

| Topic | Event | Action on `ENROLLMENT_CACHE` |
|---|---|---|
| `enrollment-created` | `EnrollmentCreatedEvent` | Upsert row by `enrollmentId`; set `studentId`, `courseId`, `status = ACTIVE`. `courseFee` defaults to 0 if not already set (fee is not carried on this event). |
| `enrollment-cancelled` | `EnrollmentCancelledEvent` | Find by `enrollmentId`; set `status = CANCELLED`. Logs a warning if the row is absent. |

### Producers

| Topic | Event | When | Payload |
|---|---|---|---|
| `fee-generated` | `FeeGeneratedEvent` | Per student, on each new cycle created in `generateMonthlyFees` | `feeCycleId`, `studentId`, `billingMonth`, `billingYear`, `totalAmount`, `occurredAt` |
| `payment-received` | `PaymentReceivedEvent` | After a payment is recorded and allocated | `paymentId`, `feeCycleId`, `studentId`, `amount`, `occurredAt` |
| `fee-status-updated` | `FeeStatusUpdatedEvent` | Immediately after `payment-received`, once the cycle status is recomputed | `feeCycleId`, `studentId`, `status` (string), `occurredAt` |

All producer messages are keyed by `studentId`.

## 9. Migrations

Clean-slate Flyway layout:

- `db/migration/V1__init_payment_schema.sql` — full schema (tables, unique
  constraints, FKs, indexes). Always applied.
- `db/seed/V2__seed_dev_data.sql` — idempotent dev/demo seed. Only on the
  `classpath` path under the **`docker`** profile
  (`spring.flyway.locations = classpath:db/migration,classpath:db/seed`); the
  default profile runs `classpath:db/migration` only.

`ddl-auto` is `validate`; the DB is owned entirely by these Flyway scripts.

### Seed contents (`V2`, docker/dev only)

- `ENROLLMENT_CACHE`: 5 `ACTIVE` enrollments — student1 has two courses
  (2500 + 3000), student2/student3/student4 one each.
- Fee cycles: student1 **Aug 2026 PAID** (total 5500, paid 5500) and **Sep 2026
  UNPAID** (5500); student2 **Sep 2026 UNPAID** (2500).
- Fee details: one per enrollment mirroring the cycles above.
- One payment: `UPI`, ref `TXN-AUG-0001`, amount 5500, settling student1's Aug
  cycle, split into two allocations (2500 + 3000).
