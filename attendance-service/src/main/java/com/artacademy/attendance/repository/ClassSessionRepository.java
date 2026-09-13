package com.artacademy.attendance.repository;

import com.artacademy.attendance.domain.ClassSession;
import com.artacademy.attendance.domain.SessionKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {

    Optional<ClassSession> findByClassIdAndSessionDate(UUID classId, LocalDate sessionDate);

    Optional<ClassSession> findByClassIdAndSessionDateAndSessionKind(
            UUID classId, LocalDate sessionDate, SessionKind sessionKind);

    List<ClassSession> findByClassId(UUID classId);

    List<ClassSession> findByClassIdAndSessionDateBetween(UUID classId, LocalDate from, LocalDate to);

    List<ClassSession> findBySessionDateBetween(LocalDate from, LocalDate to);
}
