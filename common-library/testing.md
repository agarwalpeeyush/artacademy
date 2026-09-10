# Common Library — Testing Guide

`common-library` is a JAR dependency, not a runnable service, so testing focuses on **unit tests** of its self-contained components plus a **contract note** for the shared event DTOs and topic constants. There is no HTTP server, database, or broker to spin up for these tests.

## Build & Run

```bash
# Run this module's unit tests only
mvn -pl common-library test

# Build and install the jar into the local repo (so dependent services resolve it)
mvn -pl common-library install
```

## Test Scenarios

| # | Component | Scenario | Expected result |
|---|-----------|----------|-----------------|
| 1 | `JwtUtil` | Generate a token then validate it | `generateToken(user, roles)` returns a token; `validateToken(token)` returns `true` |
| 2 | `JwtUtil` | Extract claims from a valid token | `extractUsername` returns the subject; `extractRoles` returns the roles list |
| 3 | `JwtUtil` | Validate an expired token | Set `app.jwt.expiration-ms` very low (or craft an expired token); `validateToken` returns `false` |
| 4 | `JwtUtil` | Validate a tampered / malformed / wrong-signature token | `validateToken` returns `false` (no exception thrown) |
| 5 | `ApiResponse<T>` | Serialization shape | `success(data)` → `{success:true, message:null, data:...}`; `success(msg,data)` → message set; `error(msg)` → `{success:false, message:msg, data:null}` |
| 6 | `ApiException` → `GlobalExceptionHandler` | `notFound` mapping | Response status **404**, body `ApiResponse.error(message)` |
| 7 | `ApiException` → `GlobalExceptionHandler` | `badRequest` mapping | Response status **400** |
| 8 | `ApiException` → `GlobalExceptionHandler` | `forbidden` mapping | Response status **403** |
| 9 | `ApiException` → `GlobalExceptionHandler` | `conflict` mapping | Response status **409** |
| 10 | `GlobalExceptionHandler` | `MethodArgumentNotValidException` | Status **400**, message = first field error `"field: message"` (or `"Validation failed"`) |
| 11 | `GlobalExceptionHandler` | Generic uncaught `Exception` | Status **500**, message `"Internal server error"`, exception logged |
| 12 | `JwtAuthenticationFilter` | Valid `Bearer` token | `SecurityContext` authentication is set; authorities are `ROLE_<role>`; chain continues |
| 13 | `JwtAuthenticationFilter` | Missing / invalid token on a protected path | No authentication set; downstream Spring Security authorization returns **401/403** |
| 14 | `CommonSecurityAutoConfiguration` | Auto-config on classpath | `JwtUtil`, `JwtAuthenticationFilter`, `GlobalExceptionHandler` beans present unless a service defines its own (`@ConditionalOnMissingBean`) |
| 15 | Logging | `docker` vs default profile | Default: `CONSOLE` only. `docker`: `CONSOLE` + `LOGSTASH` (TCP `${LOGSTASH_HOST:-localhost}:5000`) |

## Example — JwtUtil round trip

```java
JwtUtil jwt = new JwtUtil();
ReflectionTestUtils.setField(jwt, "secret",
    Base64.getEncoder().encodeToString("a-32-byte-minimum-test-secret-value!".getBytes()));
ReflectionTestUtils.setField(jwt, "expirationMs", 900_000L);

String token = jwt.generateToken("alice", List.of("PRINCIPAL"));
assertTrue(jwt.validateToken(token));
assertEquals("alice", jwt.extractUsername(token));
assertEquals(List.of("PRINCIPAL"), jwt.extractRoles(token));

// tampered token is rejected, not thrown
assertFalse(jwt.validateToken(token + "x"));
```

## Example — ApiException status mapping

```java
GlobalExceptionHandler handler = new GlobalExceptionHandler();
var resp = handler.handleApiException(ApiException.notFound("Student not found"));
assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());     // 404
assertFalse(resp.getBody().isSuccess());
assertEquals("Student not found", resp.getBody().getMessage());
```

## Contract Test Note

The event DTOs (`events/*Event.java`) and topic constants (`KafkaTopics`) form the **wire contract** shared by every producer and consumer on the platform. Any change to a DTO field or a topic string is a cross-service breaking change and must stay in sync across producers and consumers:

- Prefer a serialization/round-trip (contract) test that (de)serializes each event DTO to JSON to catch accidental field renames or removals.
- When adding or renaming a `KafkaTopics` constant, verify every `@KafkaListener` and `kafkaTemplate.send(...)` usage still compiles and references the constant (never a literal string).
- Note the platform quirk: `TIMETABLE_UPDATED` reuses the `TimetableGeneratedEvent` payload — there is **no** `TimetableUpdatedEvent` class. Tests asserting the timetable-update payload should expect `TimetableGeneratedEvent`.
