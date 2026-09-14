# Payment Service - Product Requirements

Manages student billing, fee cycles, payments, and receipts for the Art Academy platform.

## Roles & Features

### Principal

- Generate monthly fee cycles for all active students.
- View outstanding balances and the list of defaulters.
- View revenue summaries by month/year.
- Review per-student and per-course fee details.

### Authenticated Users

- Record a payment against a fee cycle; amounts allocate automatically (FIFO) across the cycle's course fee details.
- Look up payments by student, fee cycle, or date range.
- Download a PDF receipt for any payment.

## Fee Cycle Kinds

| Kind | Origin |
| --- | --- |
| MONTHLY | Monthly generation batch (recurring course fees) |
| ADMISSION | Created once on enrollment |
| EXAM | Created when an exam is scheduled for enrolled students |

## Behavior Highlights

- Each cycle tracks totalAmount, paidAmount, and outstandingAmount; status is UNPAID, PARTIAL, or PAID.
- Enrollment and exam events automatically drive fee-cycle creation via Kafka.
- Fee generation, payments, and status changes emit events consumed by the notification and reporting services.
