package com.artacademy.attendance.service;

import com.artacademy.attendance.domain.ClassSession;
import com.artacademy.attendance.repository.ClassSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ClassSessionService {

    private final ClassSessionRepository classSessionRepository;

    /**
     * Return the existing session for the (classId, date) pair or create a new one.
     * courseId may be null when unknown; it is only stamped when creating a new session.
     */
    public ClassSession resolveOrCreate(UUID classId, UUID courseId, LocalDate date) {
        return classSessionRepository.findByClassIdAndSessionDate(classId, date)
                .orElseGet(() -> {
                    ClassSession session = ClassSession.builder()
                            .classId(classId)
                            .courseId(courseId)
                            .sessionDate(date)
                            .build();
                    ClassSession saved = classSessionRepository.save(session);
                    log.info("Created ClassSession id={} for classId={} date={}",
                            saved.getId(), classId, date);
                    return saved;
                });
    }
}
