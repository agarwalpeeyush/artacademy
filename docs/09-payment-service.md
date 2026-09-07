# Payment Service — Detail Design Document

## 1. Overview

The `payment-service` manages the complete financial lifecycle for students: automatic monthly fee generation, payment recording, payment allocation to specific fee line items, and revenue reporting. It listens to enrollment events to maintain a local cache of active enrollments, which it uses when generating fees without calling other services at runtime.

---

## 2. Module Coordinates

| Property | Value |
|----------|-------|
| ArtifactId | `payment-service` |
| Package root | `com.artacademy.payment` |
| Server port | **8086** (registered in Eureka as `PAYMENT-SERVICE`) |
| Database | `artacademy_payments` (PostgreSQL) |

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
│   ├── FeeStatus.java           (enum)
│   ├── EnrollmentCache.java
│   ├── StudentFeeCycle.java
│   ├── StudentFeeDetail.java
│   ├── Payment.java
│   └── PaymentAllocation.java
├── dto
│   ├── GenerateFeesRequest.java
│   ├── FeeCycleResponse.java
│   ├── FeeDetailResponse.java
│   ├── PaymentRequest.java
│   ├── PaymentResponse.java
│   ├── PaymentAllocationRequest.java
│   ├── PaymentAllocationResponse.java
│   └── RevenueSummaryResponse.java
├── kafka
│   └── EnrollmentEventConsumer.java
├── mapper
│   └── PaymentMapper.java       (MapStruct)
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
PAID
PARTIAL
UNPAID
```

### 4.2 `EnrollmentCache`

Local denormalised copy of enrollment data, kept in sync via Kafka events:

```
UUID        id
UUID        enrollmentId   (unique)
UUID        studentId
UUID        courseId
BigDecimal  courseFee      (monthlyFee from course at time of enrollment)
String      status         (ACTIVE | CANCELLED)
```

### 4.3 `StudentFeeCycle`

One row per student per calendar month:

```
UUID                  id
UUID                  studentId
Integer               billingMonth     (1–12)
Integer               billingYear
BigDecimal            totalAmount
BigDecimal            paidAmount       (default 0)
BigDecimal            outstandingAmount
FeeStatus             status           (default UNPAID)
LocalDate             generatedDate
LocalDate             dueDate
List<StudentFeeDetail> details         (OneToMany cascade ALL)
```

### 4.4 `StudentFeeDetail`

One row per active enrollment within a fee cycle:

```
UUID        id
UUID        feeCycleId     (FK → student_fee_cycles)
UUID        studentId
UUID        enrollmentId
UUID        courseId
BigDecimal  courseFee
BigDecimal  allocatedPaidAmount  (default 0)
BigDecimal  outstandingAmount
FeeStatus   status
```

### 4.5 `Payment`

One row per payment transaction:

```
UUID                    id
UUID                    feeCycleId    (FK → student_fee_cycles)
UUID                    studentId
BigDecimal              amount
String                  paymentMode   (CASH | CHEQUE | ONLINE)
String                  transactionReference
LocalDate               paymentDate
String                  remarks
List<PaymentAllocation> allocations   (OneToMany cascade ALL)
```

### 4.6 `PaymentAllocation`

Distributes a payment across fee detail rows:

```
UUID        id
UUID        paymentId      (FK → payments)
UUID        feeDetailId    (FK → student_fee_details)
BigDecimal  allocatedAmount
```

---

## 5. Database Schema

Final state after V2 migration:

```sql
CREATE TABLE enrollment_cache (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id  UUID UNIQUE NOT NULL,
    student_id     UUID NOT NULL,
    course_id      UUID NOT NULL,
    course_fee     NUMERIC(10,2) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX idx_ec_student ON enrollment_cache(student_id);

CREATE TABLE student_fee_cycles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL,
    billing_month       INTEGER NOT NULL,
    billing_year        INTEGER NOT NULL,
    total_amount        NUMERIC(10,2) NOT NULL,
    paid_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    outstanding_amount  NUMERIC(10,2) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    generated_date      DATE NOT NULL,
    due_date            DATE,
    UNIQUE (student_id, billing_month, billing_year)
);
CREATE INDEX idx_sfc_student ON student_fee_cycles(student_id);

CREATE TABLE student_fee_details (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_cycle_id          UUID NOT NULL REFERENCES student_fee_cycles(id),
    student_id            UUID NOT NULL,
    enrollment_id         UUID NOT NULL,
    course_id             UUID NOT NULL,
    course_fee            NUMERIC(10,2) NOT NULL,
    allocated_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    outstanding_amount    NUMERIC(10,2) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
);

CREATE TABLE payments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_cycle_id            UUID NOT NULL REFERENCES student_fee_cycles(id),
    student_id              UUID NOT NULL,
    amount                  NUMERIC(10,2) NOT NULL,
    payment_mode            VARCHAR(50),
    transaction_reference   VARCHAR(255),
    payment_date            DATE NOT NULL,
    remarks                 TEXT
);

CREATE TABLE payment_allocations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id        UUID NOT NULL REFERENCES payments(id),
    fee_detail_id     UUID NOT NULL REFERENCES student_fee_details(id),
    allocated_amount  NUMERIC(10,2) NOT NULL
);
```

---

## 6. REST API

### 6.1 Fee Endpoints

Base path: `/fees`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/fees/generate` | PRINCIPAL | Manually trigger fee generation for a month |
| `GET` | `/fees/student/{studentId}` | PRINCIPAL, TEACHER, STUDENT | Get all fee cycles for a student |
| `GET` | `/fees/student/{studentId}/courses` | PRINCIPAL, STUDENT | Get fee details by course |
| `GET` | `/fees/cycle/{feeCycleId}` | PRINCIPAL, STUDENT | Get a single cycle with all details |
| `GET` | `/fees/outstanding/{studentId}` | PRINCIPAL, STUDENT | Get UNPAID / PARTIAL cycles |
| `GET` | `/fees/defaulters` | PRINCIPAL | List all students with outstanding balance |
| `GET` | `/fees/revenue-summary` | PRINCIPAL | Revenue summary grouped by month/year |

#### `POST /fees/generate` — Request Body

```json
{
  "billingMonth": 11,
  "billingYear": 2024
}
```

**Generation logic (see §7).**

---

### 6.2 Payment Endpoints

Base path: `/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/payments` | PRINCIPAL | Record a payment |
| `GET` | `/payments/student/{studentId}` | PRINCIPAL, STUDENT | Get payments for a student |

#### `POST /payments` — Request Body

```json
{
  "feeCycleId": "<UUID>",
  "studentId": "<UUID>",
  "amount": 3000.00,
  "paymentMode": "CASH",
  "transactionReference": "",
  "paymentDate": "2024-11-10",
  "remarks": "November fees"
}
```

---

## 7. Service Logic

### `FeeService.generateMonthlyFees(month, year)`

1. Fetch all `EnrollmentCache` rows with `status = ACTIVE`.
2. Group by `studentId`.
3. For each student:
   a. Skip if a cycle already exists for `(studentId, month, year)`.
   b. Sum `courseFee` across all active enrollments → `totalAmount`.
   c. Create `StudentFeeCycle` (status=UNPAID, paidAmount=0, outstandingAmount=totalAmount).
   d. For each enrollment: create `StudentFeeDetail` row.
   e. Publish `FeeGeneratedEvent`.

### `PaymentService.recordPayment(request)`

**FIFO allocation algorithm:**

1. Load `StudentFeeCycle` with all `StudentFeeDetail` rows.
2. Create `Payment` record.
3. Sort details by `courseId` (stable FIFO order).
4. Walk the list: for each detail with `outstandingAmount > 0`:
   - `allocate = min(remainingPayment, detail.outstandingAmount)`
   - Create `PaymentAllocation(paymentId, detailId, allocate)`.
   - Update `detail.allocatedPaidAmount += allocate` and `detail.outstandingAmount -= allocate`.
   - Update `detail.status` accordingly.
   - Decrement `remainingPayment`.
   - Stop when `remainingPayment == 0`.
5. Update `cycle.paidAmount` and `cycle.outstandingAmount`.
6. Update `cycle.status`: PAID if outstanding=0, PARTIAL if paidAmount>0 but outstanding>0, UNPAID otherwise.
7. Publish `PaymentReceivedEvent` and `FeeStatusUpdatedEvent`.

---

## 8. Scheduled Fee Generation

### `ScheduledFeeGenerationService`

```java
@Scheduled(cron = "0 0 0 1 * *")   // midnight on 1st of every month
public void generateFeesForCurrentMonth() {
    feeService.generateMonthlyFees(currentMonth, currentYear);
}
```

This runs in addition to the manual `/fees/generate` endpoint so that fees are always generated automatically. Both call the same idempotent `generateMonthlyFees()` method (duplicate cycles are skipped).

---

## 9. Kafka Integration

### Consumer — `EnrollmentEventConsumer`

| Topic | Action |
|-------|--------|
| `enrollment.created` | Upsert `EnrollmentCache` with `status=ACTIVE` |
| `enrollment.cancelled` | Update `EnrollmentCache.status = CANCELLED` |

### Producer — Events Published

| Topic | Event | When |
|-------|-------|------|
| `fee.generated` | `FeeGeneratedEvent` | After cycle creation |
| `payment.received` | `PaymentReceivedEvent` | After payment persist |
| `fee.status.updated` | `FeeStatusUpdatedEvent` | After cycle status changes |

**Consumers:** `reporting-service`, `notification-service`.

---

## 10. Migration History

| Version | Description |
|---------|-------------|
| V1 | Initial schema with BIGINT IDs |
| V2 | All tables migrated to UUID PKs; added indexes on student IDs |
