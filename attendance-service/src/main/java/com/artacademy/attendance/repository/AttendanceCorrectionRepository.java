package com.artacademy.attendance.repository;

import com.artacademy.attendance.domain.AttendanceCorrection;
import com.artacademy.attendance.domain.CorrectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, UUID> {

    List<AttendanceCorrection> findByStatus(CorrectionStatus status);

    List<AttendanceCorrection> findByRequestedByTeacherId(UUID teacherId);

    List<AttendanceCorrection> findByStudentId(UUID studentId);
}
