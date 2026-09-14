# user-service — Product Requirements

The people directory for Art Academy. It holds the master profiles for students, teachers, and parents, and is the source of truth that drives account creation across the platform.

## Features by Role

### PRINCIPAL / ADMIN
- Register, view (paginated), update, and remove students, teachers, and parents.
- When registering a student, name a guardian to auto-provision the parent record.
- Manage teacher availability: recurring weekly slots plus one-off exceptions (leave/sick, all-day or partial).
- Check whether a proposed login id is available before creating an account.

### TEACHER
- View and update own profile (`/teachers/me`).
- Maintain own recurring availability and record availability exceptions.

### STUDENT
- View and update own profile (`/students/me`).

### PARENT
- View and update own profile (`/parents/me`).
- View own children (`/parents/me/children`).

## Key Behaviors

- Creating or deleting a person emits an event so that auth accounts and other services stay in sync.
- Deleting a student also removes a parent if that parent is left with no other children.
- Parents may be contactable by phone only (no login id required).
