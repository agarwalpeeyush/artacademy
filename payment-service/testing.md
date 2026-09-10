# Payment Service — Testing Guide

This guide exercises the Payment Service against the seeded dev/demo data
(`V2__seed_dev_data.sql`, applied under the `docker` profile).

## Prerequisites

- Reach the service through the **API gateway on `http://localhost:8080`** or
  **directly on `http://localhost:8086`**. Examples below use the gateway.
- Obtain a JWT by logging in through auth. The seeded principal is
  `admin` / **`Admin@1234`** (PRINCIPAL role). Fee generation, `GET /payments`,
  defaulters, and revenue-summary require PRINCIPAL; recording payments requires
  PRINCIPAL or TEACHER.
- Send `Authorization: Bearer <token>` on every request.

### Seeded reference data

| Entity | ID | Notes |
|---|---|---|
| Student 1 | `00000000-0000-0000-0003-000000000001` | Two courses (2500 + 3000) |
| Student 2 | `00000000-0000-0000-0003-000000000002` | One course (2500) |
| Cycle — S1 Aug 2026 | `00000000-0000-0000-1301-000000000001` | PAID, total 5500 |
| Cycle — S1 Sep 2026 | `00000000-0000-0000-1301-000000000002` | UNPAID, total 5500 |
| Cycle — S2 Sep 2026 | `00000000-0000-0000-1301-000000000003` | UNPAID, total 2500 |
| Payment — S1 Aug | `00000000-0000-0000-1303-000000000001` | UPI, TXN-AUG-0001, 5500 |

## API Scenarios

| # | Scenario | Request | Expected result |
|---|---|---|---|
| 1 | Generate a fee cycle | `POST /fees/generate` `{ "billingMonth": 10, "billingYear": 2026 }` (PRINCIPAL) | 201; one cycle per student with active enrollments; each cycle `UNPAID`, `outstanding = total`, one fee detail per course; re-running the same month returns the existing cycle (no duplicate). |
| 2 | View a cycle + its details | `GET /fees/cycle/00000000-0000-0000-1301-000000000002` | 200; S1 Sep cycle, `status=UNPAID`, `total=5500`, `details` = two lines (2500 + 3000), each `UNPAID`. |
| 3 | View per-course details for a cycle | `GET /fees/cycle/00000000-0000-0000-1301-000000000002/details` | 200; two `FeeDetailResponse` rows for the Sep cycle. |
| 4 | Make a full payment → PAID | `POST /payments` `{ "feeCycleId":"...1301-...0002", "studentId":"...0003-...0001", "amount":5500.00, "paymentMode":"UPI", "transactionReference":"TXN-SEP-0001" }` | 201; `PaymentResponse` with two allocations (2500 + 3000); cycle recomputes to `PAID`, `paidAmount=5500`, `outstanding=0`. |
| 5 | Partial payment → PARTIAL | On a fresh UNPAID cycle (e.g. S2 Sep, total 2500) `POST /payments` with `amount=1000.00` | 201; single allocation of 1000; that fee detail `PARTIAL`; cycle `PARTIAL`, `paidAmount=1000`, `outstanding=1500`. |
| 6 | FIFO allocation across two courses | On S1 Sep (2500 + 3000, total 5500) `POST /payments` with `amount=4000.00` | 201; lowest-`courseId` detail fully paid (2500), remainder (1500) applied to the next detail (leaving 1500 outstanding); cycle `PARTIAL`, `paidAmount=4000`. |
| 7 | Outstanding for a student | `GET /fees/outstanding/00000000-0000-0000-0003-000000000001` | 200; returns S1's UNPAID/PARTIAL Sep cycle (Aug is PAID and excluded). |
| 8 | Defaulters (all students) | `GET /fees/defaulters` (PRINCIPAL) | 200; includes **S1 Sep** and **S2 Sep** (both UNPAID); PAID cycles excluded. Cycles whose due date has passed show `displayStatus=OVERDUE`. |
| 9 | Revenue summary | `GET /fees/revenue-summary` (PRINCIPAL) | 200; row for `2026-08` reflects **₹5500** paid (from the seeded Aug payment); other months reflect any payments made in scenarios 4–6. |
| 10 | Receipt PDF download | `GET /payments/00000000-0000-0000-1303-000000000001/receipt` | 200; `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="receipt-<id>.pdf"`; body is a valid PDF showing the two allocations and cycle summary. |
| 11 | List payments by date range | `GET /payments?startDate=2026-08-01&endDate=2026-08-31` (PRINCIPAL) | 200; includes the seeded Aug UPI payment (5500). |
| 12 | Payments for a student | `GET /payments/student/00000000-0000-0000-0003-000000000001` | 200; lists S1's payments, each with its allocations. |

## Notes & tips

- Scenarios 4–6 are mutually exclusive on a given cycle (each consumes the
  cycle's outstanding balance) — reset the DB or use different cycles/months to
  re-run.
- `paymentMode` is free text (`UPI`, `CASH`, `CARD`, …) and must be non-blank;
  `amount` must be >= 0.01.
- Overpaying a cycle records the payment but only allocates up to the
  outstanding total (a warning is logged); no refund/carry-forward occurs.
- `POST /fees/generate` accepts `billingMonth` 1–12 and `billingYear` >= 2000;
  invalid values return 400 with validation messages.
- A missing `feeCycleId` on `POST /payments` (or an unknown id on cycle/payment
  GETs) returns an error from `EntityNotFoundException`.
- Roles matter: as a STUDENT, `GET /fees/defaulters`, `GET /fees/revenue-summary`
  and `GET /payments` (list-all) return 403; `POST` endpoints require
  PRINCIPAL/TEACHER.
