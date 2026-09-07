package com.artacademy.reporting.repository;

import com.artacademy.reporting.domain.StudentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentReportRepository extends JpaRepository<StudentReport, UUID> {

    Page<StudentReport> findAll(Pageable pageable);

    Optional<StudentReport> findByStudentId(UUID studentId);

    @Query("SELECT s FROM StudentReport s WHERE s.activeFeeBalance > 0 ORDER BY s.activeFeeBalance DESC")
    List<StudentReport> findDefaulters();
}
