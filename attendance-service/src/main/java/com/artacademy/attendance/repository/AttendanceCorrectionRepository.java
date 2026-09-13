package com.artacademy.attendance.repository;

import com.artacademy.attendance.domain.AttendanceCorrection;
import com.artacademy.attendance.domain.AttendanceRecordType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, UUID> {

    List<AttendanceCorrection> findByAttendanceId(UUID attendanceId);

    List<AttendanceCorrection> findBySubjectId(UUID subjectId);

    List<AttendanceCorrection> findByAttendanceTypeAndClassIdAndAttendanceDate(
            AttendanceRecordType attendanceType, UUID classId, java.time.LocalDate attendanceDate);
}
