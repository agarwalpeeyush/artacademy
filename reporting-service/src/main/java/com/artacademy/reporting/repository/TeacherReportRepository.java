package com.artacademy.reporting.repository;

import com.artacademy.reporting.domain.TeacherReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherReportRepository extends JpaRepository<TeacherReport, UUID> {

    List<TeacherReport> findAll();

    Optional<TeacherReport> findByTeacherId(UUID teacherId);
}
