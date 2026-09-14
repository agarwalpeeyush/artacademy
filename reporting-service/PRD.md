# Reporting Service - Product Requirements

Provides consolidated attendance, revenue, student, and teacher reports for the Art Academy platform.

## Roles & Features

### Principal (only role with access)

- **Attendance reports** for students or teachers, by month/year or date range.
- **Attendance exceptions** - subjects falling below an attendance threshold (default 75%).
- **Monthly attendance** grouped by course.
- **Attendance export** as CSV.
- **Revenue reports** by year/month (most recent first) and per-month fee revenue.
- **Defaulters** list of students with outstanding fees.
- **Student reports** (paginated) with enrollment counts, fee balance, and last payment date.
- **Teacher reports** with class counts and attendance percentage.

## Data Source

- All reports are read-only materialised views.
- Data is built entirely from Kafka events (attendance, enrollment, payment, fee, student, and teacher events) - the service publishes no events of its own.
