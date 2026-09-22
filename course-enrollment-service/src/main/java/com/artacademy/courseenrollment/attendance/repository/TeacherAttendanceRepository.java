package com.artacademy.courseenrollment.attendance.repository;

import com.artacademy.courseenrollment.attendance.domain.TeacherAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherAttendanceRepository extends JpaRepository<TeacherAttendance, UUID> {

    List<TeacherAttendance> findByTeacherId(UUID teacherId);

    List<TeacherAttendance> findByTeacherIdAndAttendanceDateBetween(
            UUID teacherId, LocalDate from, LocalDate to);

    Optional<TeacherAttendance> findByTeacherIdAndTimetableIdAndAttendanceDate(
            UUID teacherId, UUID timetableId, LocalDate attendanceDate);

    List<TeacherAttendance> findByTimetableIdAndAttendanceDate(UUID timetableId, LocalDate attendanceDate);
}
