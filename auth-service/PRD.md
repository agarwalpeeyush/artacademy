# auth-service — Product Requirements

The authentication and access-control service for the Art Academy platform. It authenticates users, manages roles, and secures every other service via JWT.

## Roles

ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT.

## Features by Role

### All authenticated users
- Log in and receive a JWT (with refresh token); log out.
- View own profile (`/me`).
- Change own password.
- Recover a forgotten password via a time-limited (1hr) email reset link.

### PRINCIPAL
- View a paginated list of all users.
- Activate or deactivate user accounts.
- View and assign roles for any user.
- Review a paginated, username-filterable audit log of security-relevant actions.

### Bootstrap admin (first-run only)
- Seeded automatically in docker environments to bring the platform online.
- May create the first PRINCIPAL, then self-deactivates and cannot change its own password.

## Cross-Service Behavior

- Auth accounts for students, teachers, and parents are created automatically (with a shared UUID) when the user-service emits the corresponding created event, and removed on the deleted event. Administrators do not create these accounts manually.

## Security Guarantees

- Accounts lock for 15 minutes after 5 failed login attempts.
- Deactivated accounts cannot authenticate.
- Password reset tokens are single-use and expire after 1 hour.
- Every login, logout, status change, and role change is audited with IP address and success flag.
