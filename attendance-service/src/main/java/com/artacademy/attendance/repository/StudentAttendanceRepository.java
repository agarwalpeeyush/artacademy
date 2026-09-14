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

    List<StudentAttendance> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    List<StudentAttendance> findByStudentIdAndAttendanceDateBetween(
            UUID studentId, LocalDate from, LocalDate to);

    List<StudentAttendance> findByTimetableIdAndAttendanceDate(UUID timetableId, LocalDate attendanceDate);

    Optional<StudentAttendance> findByStudentIdAndTimetableIdAndAttendanceDate(
            UUID studentId, UUID timetableId, LocalDate attendanceDate);

    boolean existsByStudentIdAndTimetableIdAndAttendanceDate(
            UUID studentId, UUID timetableId, LocalDate attendanceDate);
}
