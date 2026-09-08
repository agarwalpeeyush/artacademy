package com.artacademy.attendance.repository;

import com.artacademy.attendance.domain.StudentAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentAttendanceRepository extends JpaRepository<StudentAttendance, UUID> {

    List<StudentAttendance> findByStudentId(UUID studentId);

    List<StudentAttendance> findByStudentIdAndClassId(UUID studentId, UUID classId);

    List<StudentAttendance> findByStudentIdAndAttendanceDateBetween(
            UUID studentId, LocalDate from, LocalDate to);

    List<StudentAttendance> findByClassIdAndAttendanceDate(UUID classId, LocalDate attendanceDate);

    Optional<StudentAttendance> findByStudentIdAndClassIdAndAttendanceDate(
            UUID studentId, UUID classId, LocalDate attendanceDate);

    boolean existsByStudentIdAndClassIdAndAttendanceDate(
            UUID studentId, UUID classId, LocalDate attendanceDate);
}
