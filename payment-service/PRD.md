# Payment Service — Product Requirements Document

## Purpose

Provide fee billing and payment collection for the Art Academy platform. The
service converts a student's active course enrollments into a monthly fee cycle,
lets staff record and receipt payments, tracks how much each student owes, and
surfaces principal-level reporting on defaulters and revenue. It integrates with
the rest of the platform purely through Kafka events — consuming enrollment
changes and publishing fee/payment events.

## Scope

In scope:

- Monthly fee-cycle generation per student (manual endpoint + scheduled job).
- Per-course fee breakdown (fee details) within each cycle.
- Recording payments and automatically allocating them across outstanding
  course fees (FIFO).
- Fee/payment status tracking and outstanding-balance queries.
- Defaulter list and revenue summary for the principal.
- Downloadable PDF payment receipts.
- A local enrollment cache maintained from enrollment events.

Out of scope:

- Payment-gateway / real-money processing (payments are recorded, not charged).
- Refunds and reversals.
- Course/enrollment lifecycle ownership (owned by other services).
- Notification delivery (a downstream service consumes the published events).

## Functional Requirements

| ID | Requirement | Roles |
|---|---|---|
| FEE-01 | Generate monthly fee cycles for all active students for a given month/year via `POST /fees/generate`. | PRINCIPAL |
| FEE-02 | Automatically generate fee cycles for the current month via a scheduled job (cron `0 0 1 * * *`, midnight on the 1st). | System |
| FEE-03 | Group a student's active enrollments into one cycle with one fee detail per enrolled course. | System |
| FEE-04 | List all fee cycles for a student (`GET /fees/student/{id}`). | STUDENT, TEACHER, PRINCIPAL |
| FEE-05 | List all per-course fee details for a student (`GET /fees/student/{id}/courses`). | STUDENT, TEACHER, PRINCIPAL |
| FEE-06 | Retrieve a fee cycle with its details (`GET /fees/cycle/{id}`) and its details alone (`GET /fees/cycle/{id}/details`). | STUDENT, TEACHER, PRINCIPAL |
| FEE-07 | List a student's outstanding (UNPAID + PARTIAL) cycles (`GET /fees/outstanding/{id}`). | STUDENT, TEACHER, PRINCIPAL |
| FEE-08 | List all defaulters — every UNPAID + PARTIAL cycle across students (`GET /fees/defaulters`). | PRINCIPAL |
| FEE-09 | Produce a revenue summary of total paid grouped by billing year/month (`GET /fees/revenue-summary`). | PRINCIPAL |
| FEE-10 | Record a payment against a fee cycle (`POST /payments`), allocating it FIFO across outstanding fee details. | PRINCIPAL, TEACHER |
| FEE-11 | List all payments with optional date-range filter (`GET /payments`). | PRINCIPAL |
| FEE-12 | List payments for a student (`GET /payments/student/{id}`) or a fee cycle (`GET /payments/fee-cycle/{id}`), and fetch one payment (`GET /payments/{id}`). | STUDENT, TEACHER, PRINCIPAL |
| FEE-13 | Download a PDF receipt for a payment (`GET /payments/{id}/receipt`). | STUDENT, TEACHER, PRINCIPAL |
| FEE-14 | Derive an `OVERDUE` display flag and excess/short amounts for cycles on read (not persisted). | System |
| FEE-15 | Maintain a local enrollment cache from `enrollment-created` / `enrollment-cancelled` events. | System |
| FEE-16 | Publish `fee-generated`, `payment-received`, and `fee-status-updated` events. | System |

## Business Rules

- **One cycle per student per month:** at most one `StudentFeeCycle` exists for a
  given `(studentId, billingMonth, billingYear)`, enforced by a database unique
  constraint. Regenerating an existing month is idempotent — the existing cycle
  is returned, not duplicated.
- **Cycle composition:** a cycle's total equals the sum of the `courseFee` of the
  student's `ACTIVE` enrollments; each active enrollment becomes exactly one fee
  detail (unique per `(feeCycleId, enrollmentId)`). Only `ACTIVE` enrollments are
  billed; `CANCELLED` ones are excluded.
- **Due date:** the last day of the billing month at 23:59:59.
- **FIFO allocation:** a payment is applied to the cycle's not-yet-`PAID` fee
  details in ascending `courseId` order. Each detail receives
  `min(remaining, detail.outstanding)` until the payment is exhausted.
- **Status from paid vs total:**
  - Fee detail — `PAID` when its outstanding reaches 0, else `PARTIAL` once any
    amount is allocated, else `UNPAID`.
  - Fee cycle — `PAID` when all details are paid; `PARTIAL` when some amount has
    been paid but not all; `UNPAID` when nothing has been paid.
- **Overpayment:** any amount beyond the total outstanding is not allocated; the
  service logs a warning. There is no automatic refund or carry-forward.
- **OVERDUE is a view concept:** a cycle is shown as `OVERDUE` when it is not
  fully paid and its due date has passed. It is never stored — the persisted
  status remains `UNPAID`/`PARTIAL`.
- **Amounts:** stored as `NUMERIC(12,2)`; receipts render amounts as `INR`.

## Dependencies

Consumes (Kafka):

| Topic | Event | Effect |
|---|---|---|
| `enrollment-created` | `EnrollmentCreatedEvent` | Upserts an `ACTIVE` row in the enrollment cache (course fee defaults to 0 if not yet known). |
| `enrollment-cancelled` | `EnrollmentCancelledEvent` | Marks the cached enrollment `CANCELLED` so it is excluded from future cycles. |

Produces (Kafka):

| Topic | Event | Trigger |
|---|---|---|
| `fee-generated` | `FeeGeneratedEvent` | A new fee cycle is created for a student. |
| `payment-received` | `PaymentReceivedEvent` | A payment is successfully recorded. |
| `fee-status-updated` | `FeeStatusUpdatedEvent` | A cycle's status is recomputed after a payment. |

Platform dependencies:

- **PostgreSQL** database `payment_db` (schema owned by Flyway).
- **Config Server** (`http://localhost:8888`) for `payment-service.yml`.
- **Kafka** broker for the events above.
- **JWT auth** from `common-library` (stateless; roles STUDENT / TEACHER /
  PRINCIPAL). Reachable via the API gateway on `8080` or directly on `8086`.
