package com.artacademy.reporting.service;

import com.artacademy.reporting.domain.AttendanceSummary;
import com.artacademy.reporting.domain.RevenueSummary;
import com.artacademy.reporting.domain.StudentReport;
import com.artacademy.reporting.domain.TeacherReport;
import com.artacademy.reporting.dto.*;
import com.artacademy.reporting.repository.AttendanceSummaryRepository;
import com.artacademy.reporting.repository.RevenueSummaryRepository;
import com.artacademy.reporting.repository.StudentReportRepository;
import com.artacademy.reporting.repository.TeacherReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportingService {

    private final AttendanceSummaryRepository attendanceSummaryRepository;
    private final RevenueSummaryRepository revenueSummaryRepository;
    private final StudentReportRepository studentReportRepository;
    private final TeacherReportRepository teacherReportRepository;

    /**
     * Returns attendance summaries filtered by subjectType.
     * If both month and year are provided, filters by month/year as well.
     * If only subjectType, returns all records for that type.
     */
    public List<AttendanceSummaryResponse> getAttendanceReport(
            String subjectType,
            Optional<Integer> month,
            Optional<Integer> year) {

        List<AttendanceSummary> summaries;

        if (month.isPresent() && year.isPresent()) {
            summaries = attendanceSummaryRepository
                    .findByAttendanceMonthAndAttendanceYear(month.get(), year.get())
                    .stream()
                    .filter(s -> s.getSubjectType().equalsIgnoreCase(subjectType))
                    .collect(Collectors.toList());
        } else {
            summaries = attendanceSummaryRepository
                    .findAll()
                    .stream()
                    .filter(s -> s.getSubjectType().equalsIgnoreCase(subjectType))
                    .collect(Collectors.toList());
        }

        return summaries.stream()
                .map(this::toAttendanceSummaryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns all revenue summaries ordered by year DESC, month DESC.
     */
    public List<RevenueSummaryResponse> getRevenueReport() {
        return revenueSummaryRepository.findAllByOrderByBillingYearDescBillingMonthDesc()
                .stream()
                .map(this::toRevenueSummaryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns a paginated list of student reports.
     */
    public Page<StudentReportResponse> getStudentReports(Pageable pageable) {
        return studentReportRepository.findAll(pageable)
                .map(this::toStudentReportResponse);
    }

    /**
     * Returns all teacher reports.
     */
    public List<TeacherReportResponse> getTeacherReports() {
        return teacherReportRepository.findAll()
                .stream()
                .map(this::toTeacherReportResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns the revenue summary for a specific billing month and year.
     * Returns an empty summary if none exists yet.
     */
    public RevenueSummaryResponse getFeeReport(Integer month, Integer year) {
        return revenueSummaryRepository.findByBillingMonthAndBillingYear(month, year)
                .map(this::toRevenueSummaryResponse)
                .orElseGet(() -> RevenueSummaryResponse.builder()
                        .billingMonth(month)
                        .billingYear(year)
                        .totalBilled(BigDecimal.ZERO)
                        .totalCollected(BigDecimal.ZERO)
                        .outstanding(BigDecimal.ZERO)
                        .studentCount(0)
                        .build());
    }

    /**
     * Returns students who have an outstanding fee balance, sorted by balance descending.
     */
    public List<DefaulterResponse> getDefaulters() {
        return studentReportRepository.findDefaulters()
                .stream()
                .map(s -> DefaulterResponse.builder()
                        .studentId(s.getStudentId())
                        .firstName(s.getFirstName())
                        .lastName(s.getLastName())
                        .activeFeeBalance(s.getActiveFeeBalance())
                        .build())
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Mapping helpers
    // -------------------------------------------------------------------------

    private AttendanceSummaryResponse toAttendanceSummaryResponse(AttendanceSummary s) {
        return AttendanceSummaryResponse.builder()
                .id(s.getId())
                .subjectType(s.getSubjectType())
                .subjectId(s.getSubjectId())
                .subjectName(s.getSubjectName())
                .attendanceMonth(s.getAttendanceMonth())
                .attendanceYear(s.getAttendanceYear())
                .totalDays(s.getTotalDays())
                .presentDays(s.getPresentDays())
                .absentDays(s.getAbsentDays())
                .leaveDays(s.getLeaveDays())
                .build();
    }

    private RevenueSummaryResponse toRevenueSummaryResponse(RevenueSummary r) {
        return RevenueSummaryResponse.builder()
                .id(r.getId())
                .billingMonth(r.getBillingMonth())
                .billingYear(r.getBillingYear())
                .totalBilled(r.getTotalBilled())
                .totalCollected(r.getTotalCollected())
                .outstanding(r.getOutstanding())
                .studentCount(r.getStudentCount())
                .build();
    }

    private StudentReportResponse toStudentReportResponse(StudentReport s) {
        return StudentReportResponse.builder()
                .id(s.getId())
                .studentId(s.getStudentId())
                .firstName(s.getFirstName())
                .lastName(s.getLastName())
                .totalEnrollments(s.getTotalEnrollments())
                .activeFeeBalance(s.getActiveFeeBalance())
                .lastPaymentDate(s.getLastPaymentDate())
                .build();
    }

    private TeacherReportResponse toTeacherReportResponse(TeacherReport t) {
        return TeacherReportResponse.builder()
                .id(t.getId())
                .teacherId(t.getTeacherId())
                .employeeCode(t.getEmployeeCode())
                .firstName(t.getFirstName())
                .lastName(t.getLastName())
                .totalClasses(t.getTotalClasses())
                .attendancePercentage(t.getAttendancePercentage())
                .build();
    }
}
