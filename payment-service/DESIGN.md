# Payment Service - Design

Owns fee-cycle generation, payment recording with FIFO allocation, and PDF receipts for the Art Academy platform.

- **Stack:** Spring Boot 3.3.4, Java 21, PostgreSQL (Flyway `validate`), Kafka, JWT via common-library.
- **Port:** 8086
- **Database:** `payment_db`
- **Responses:** wrapped in `ApiResponse<T> {success, message, data}`.

## Endpoints

### FeeController (`/fees`)

| Method | Path | Description | Role |
| --- | --- | --- | --- |
| POST | `/fees/generate` | Generate monthly fee cycles for active students | PRINCIPAL |
| GET | `/fees/student/{studentId}` | Fee cycles for a student | |
| GET | `/fees/student/{studentId}/courses` | Per-course fee details for a student | |
| GET | `/fees/cycle/{feeCycleId}` | Single fee cycle | |
| GET | `/fees/cycle/{feeCycleId}/details` | Fee-detail breakdown for a cycle | |
| GET | `/fees/outstanding/{studentId}` | Outstanding balance | |
| GET | `/fees/defaulters` | Students with unpaid/partial cycles | |
| GET | `/fees/revenue-summary` | Revenue summary by month/year | |

### PaymentController (`/payments`)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/payments` | Record a payment against a cycle |
| GET | `/payments` | List payments (optional date range) |
| GET | `/payments/student/{studentId}` | Payments for a student |
| GET | `/payments/fee-cycle/{feeCycleId}` | Payments for a cycle |
| GET | `/payments/{paymentId}` | Single payment |
| GET | `/payments/{paymentId}/receipt` | Payment receipt (PDF) |

## Entities

| Entity | Table | Key fields | Constraints |
| --- | --- | --- | --- |
| StudentFeeCycle | STUDENT_FEE_CYCLES | studentId, billingMonth, billingYear, cycleKind (MONTHLY\|ADMISSION\|EXAM), sourceRef, totalAmount, paidAmount, outstandingAmount, status (UNPAID\|PARTIAL\|PAID), generatedDate, dueDate | unique studentId+billingMonth+billingYear+cycleKind+sourceRef |
| StudentFeeDetail | | feeCycleId, studentId, enrollmentId, courseId, courseFee, allocatedPaidAmount, outstandingAmount, status | unique feeCycleId+enrollmentId |
| Payment | | feeCycleId, studentId, amount, paymentMode, transactionReference, paymentDate, remarks | |
| PaymentAllocation | | paymentId, feeDetailId, allocatedAmount (FIFO) | |
| EnrollmentCache | ENROLLMENT_CACHE | enrollmentId (PK), studentId, courseId, courseFee (recurring total), status | read-model |

## Allocation Logic

- Payments allocate **FIFO** across a cycle's fee details.
- A cycle's `status` derives from paid vs total (UNPAID / PARTIAL / PAID).

## Migrations

| Version | Description |
| --- | --- |
| V1__init_payment_schema.sql | 6 tables + indices |
| db/seed V2 | Docker-only seed data |

## Kafka

**Produces:**

| Topic | Trigger |
| --- | --- |
| fee-generated | On monthly fee generation |
| payment-received | After a payment is recorded |
| fee-status-updated | On cycle status change |

**Consumes:**

| Topic | Effect |
| --- | --- |
| enrollment-created | Cache enrolment; create one-time ADMISSION fee cycle; sum recurring fees into COURSE_FEE for monthly batch |
| enrollment-cancelled | Mark cache CANCELLED |
| exam-scheduled | Create one-time EXAM fee cycles for enrolled students |
