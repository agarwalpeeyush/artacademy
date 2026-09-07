package com.artacademy.reporting.repository;

import com.artacademy.reporting.domain.AttendanceSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceSummaryRepository extends JpaRepository<AttendanceSummary, UUID> {

    List<AttendanceSummary> findBySubjectTypeAndSubjectId(String subjectType, UUID subjectId);

    List<AttendanceSummary> findByAttendanceMonthAndAttendanceYear(Integer attendanceMonth, Integer attendanceYear);

    Optional<AttendanceSummary> findBySubjectTypeAndSubjectIdAndAttendanceMonthAndAttendanceYear(
            String subjectType, UUID subjectId, Integer attendanceMonth, Integer attendanceYear);
}
