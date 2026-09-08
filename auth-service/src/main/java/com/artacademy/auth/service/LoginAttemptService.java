package com.artacademy.auth.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_DURATION_SECONDS = 15 * 60; // 15 minutes

    private record AttemptRecord(AtomicInteger count, Instant lockedUntil) {}

    private final Map<String, AttemptRecord> attempts = new ConcurrentHashMap<>();

    public void recordFailure(String username) {
        AttemptRecord record = attempts.computeIfAbsent(username,
                k -> new AttemptRecord(new AtomicInteger(0), null));
        int count = record.count().incrementAndGet();
        if (count >= MAX_ATTEMPTS) {
            // Reassign lockedUntil by replacing the record
            attempts.put(username, new AttemptRecord(record.count(), Instant.now().plusSeconds(LOCK_DURATION_SECONDS)));
        }
    }

    public void recordSuccess(String username) {
        attempts.remove(username);
    }

    public boolean isBlocked(String username) {
        AttemptRecord record = attempts.get(username);
        if (record == null) return false;
        if (record.lockedUntil() == null) return false;
        if (Instant.now().isAfter(record.lockedUntil())) {
            attempts.remove(username);
            return false;
        }
        return true;
    }

    /** Returns the number of seconds remaining in the lockout, or 0 if not locked. */
    public long secondsUntilUnlock(String username) {
        AttemptRecord record = attempts.get(username);
        if (record == null || record.lockedUntil() == null) return 0;
        long remaining = record.lockedUntil().getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }
}
