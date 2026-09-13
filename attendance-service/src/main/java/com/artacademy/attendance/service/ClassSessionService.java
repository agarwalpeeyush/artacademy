package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.ClassSession;
import com.artacademy.attendance.domain.SessionKind;
import com.artacademy.attendance.repository.ClassSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ClassSessionService {

    private final ClassSessionRepository classSessionRepository;

    /**
     * Return the existing REGULAR session for the (classId, date) pair or create a new one.
     * courseId may be null when unknown; it is only stamped when creating a new session.
     * COVER_UP sessions are never matched or created here — they are created explicitly via
     * {@link #createCoverUp}.
     */
    public ClassSession resolveOrCreate(UUID classId, UUID courseId, LocalDate date) {
        return classSessionRepository
                .findByClassIdAndSessionDateAndSessionKind(classId, date, SessionKind.REGULAR)
                .orElseGet(() -> {
                    ClassSession session = ClassSession.builder()
                            .classId(classId)
                            .courseId(courseId)
                            .sessionDate(date)
                            .sessionKind(SessionKind.REGULAR)
                            .build();
                    ClassSession saved = classSessionRepository.save(session);
                    log.info("Created REGULAR ClassSession id={} for classId={} date={}",
                            saved.getId(), classId, date);
                    return saved;
                });
    }

    /**
     * Create a COVER_UP_CLASS session for a class (R18). A cover-up is an ad-hoc extra session run
     * for a subset of students who missed the regular one; it carries its own date/time and may
     * link back to the missed regular session via {@code originalSessionId}. Free — no fee.
     */
    public ClassSession createCoverUp(UUID classId, UUID courseId, LocalDate date,
                                      LocalTime startTime, LocalTime endTime, UUID originalSessionId) {
        ClassSession session = ClassSession.builder()
                .classId(classId)
                .courseId(courseId)
                .sessionDate(date)
                .startTime(startTime)
                .endTime(endTime)
                .sessionKind(SessionKind.COVER_UP_CLASS)
                .originalSessionId(originalSessionId)
                .build();
        ClassSession saved = classSessionRepository.save(session);
        log.info("Created COVER_UP_CLASS ClassSession id={} for classId={} date={} originalSessionId={}",
                saved.getId(), classId, date, originalSessionId);
        return saved;
    }
}
