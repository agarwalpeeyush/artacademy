# Auth Service — Testing Guide

These scenarios exercise the `/auth` API. You can run them against the api-gateway at
`http://localhost:8080` (routes `/auth/**` to this service) or directly against the
service at `http://localhost:8081`. The examples below use the gateway URL.

All seeded accounts use the password **`Admin@1234`**. Staff/student logins have emails
`<username>@artacademy.test` (e.g. `principal`, `teacher1`, `student1`). The seeded parent
logs in with **its phone number as the username** (`9100000002`, email
`parent1@artacademy.test`) — auto-provisioned parents may have no email at all. The seed
data (and the 5 roles live in the V1 migration) is loaded only under the `docker` profile;
reset passwords must be at least 8 characters.

Protected endpoints require an `Authorization: Bearer <accessToken>` header. Obtain a
token from scenario 1 and export it, e.g.:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"principal","password":"Admin@1234"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
```

## API Test Scenarios

| # | Scenario | Steps (curl or endpoint) | Expected |
|---|----------|--------------------------|----------|
| 1 | Login success | `curl -X POST :8080/auth/login -H 'Content-Type: application/json' -d '{"username":"principal","password":"Admin@1234"}'` | `200`; `data` has `accessToken`, `refreshToken`, `tokenType:"Bearer"`, `id`, `username`, `email`, `roles:["PRINCIPAL"]` |
| 2 | Login failure (bad password) | Same as #1 with `"password":"wrong"` | `400` "Invalid credentials"; `LOGIN_FAILED` audit row written |
| 3 | Login failure (unknown user) | Login with `"username":"nobody"` | `400` "Invalid credentials" |
| 4 | Lockout after 5 failures | Repeat #2 five times for the same username, then attempt a valid login | Attempts 1–5 return `400`; the 6th (and further) attempts return `403` "Account temporarily locked. Try again in N seconds." for 15 minutes |
| 5 | Refresh token | `curl -X POST :8080/auth/refresh -H 'Content-Type: application/json' -d '{"refreshToken":"<refreshToken from #1>"}'` | `200`; new `accessToken` + new `refreshToken` (old refresh token no longer valid) |
| 6 | Refresh with invalid token | `POST /auth/refresh` with a random/expired token | `400` "Invalid refresh token" (or "Refresh token expired…") |
| 7 | Forgot password (known email) | `curl -X POST :8080/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"principal@artacademy.test"}'` | `200` "If your email is registered, a reset token has been sent"; `notification-request` event published with the token |
| 8 | Forgot password (unknown email) | Same as #7 with `"email":"nobody@artacademy.test"` | `200` with the same message (no enumeration); no token created |
| 9 | Reset password | `curl -X POST :8080/auth/reset-password -H 'Content-Type: application/json' -d '{"token":"<token from #7>","newPassword":"NewPass@123"}'` | `200` "Password reset successful"; token marked used; `RESET_PASSWORD` audit row |
| 10 | Reset with used/expired token | Repeat #9 with the same (now used) token | `400` "Token has already been used" (or "Token has expired" / "Invalid or expired token") |
| 11 | Change password | `curl -X POST :8080/auth/change-password -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"currentPassword":"Admin@1234","newPassword":"NewPass@123"}'` | `200` "Password changed"; `CHANGE_PASSWORD` audit row |
| 12 | Change password (wrong current) | Same as #11 with `"currentPassword":"wrong"` | `400` "Current password is incorrect"; `CHANGE_PASSWORD_FAILED` audit row |
| 13 | Current profile `/me` | `curl :8080/auth/me -H "Authorization: Bearer $TOKEN"` | `200`; `data` = `{id, username, email, roles, status}` |
| 14 | Logout | `curl -X POST :8080/auth/logout -H "Authorization: Bearer $TOKEN"` | `200` "Logged out"; caller's refresh token(s) deleted; `LOGOUT` audit row |
| 15 | Unauthenticated access to protected route | `curl :8080/auth/me` (no header) | `401`/`403` — authentication required |
| 16 | List users (PRINCIPAL) | `curl ":8080/auth/users?page=0&size=20" -H "Authorization: Bearer $TOKEN"` | `200`; paged `UserSummaryResponse` list |
| 17 | List users as non-PRINCIPAL | Repeat #16 with a token from `student1` | `403` forbidden |
| 18 | Get user roles (PRINCIPAL) | `curl :8080/auth/users/00000000-0000-0000-0003-000000000001/roles -H "Authorization: Bearer $TOKEN"` | `200`; `["STUDENT"]` |
| 19 | Replace user roles (PRINCIPAL) | `curl -X PUT :8080/auth/users/00000000-0000-0000-0003-000000000001/roles -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"roles":["STUDENT","PARENT"]}'` | `200`; user's roles replaced; `UPDATE_USER_ROLES` audit row |
| 20 | Replace roles with unknown role | Repeat #19 with `{"roles":["WIZARD"]}` | `400` "Role not found: WIZARD" |
| 21 | Update user status (PRINCIPAL) | `curl -X PATCH :8080/auth/users/00000000-0000-0000-0003-000000000001/status -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"INACTIVE"}'` | `200`; status updated; `UPDATE_USER_STATUS` audit row |
| 22 | Deactivated user cannot log in | After #21, log in as `student1` | `403` "Account is not active"; `LOGIN_FAILED` audit row (restore with #21 → `"ACTIVE"`) |
| 23 | View audit logs (PRINCIPAL) | `curl ":8080/auth/audit-logs?size=20" -H "Authorization: Bearer $TOKEN"` | `200`; paged audit entries sorted by `occurredAt` DESC |
| 24 | Filter audit logs by username | `curl ":8080/auth/audit-logs?username=principal" -H "Authorization: Bearer $TOKEN"` | `200`; only entries for `principal` |
| 25 | Audit logs as non-PRINCIPAL | Repeat #23 with a `student1` token | `403` forbidden |
| 26 | Parent logs in by phone | `curl -X POST :8080/auth/login -H 'Content-Type: application/json' -d '{"username":"9100000002","password":"Admin@1234"}'` | `200`; `roles:["PARENT"]`; `/me` may show a null `email` for phone-only parents |
| 27 | Malformed created-event routed to DLT | Publish a `student-created` event missing `studentId`/`username` | consumer rejects it; after retries the record lands on `student-created.DLT`; no user row created |
