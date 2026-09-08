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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
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
     * If startDate and endDate are provided, aggregates per subject across the covered month span.
     * Else if both month and year are provided, filters by that month/year.
     * Otherwise returns all records for that type.
     */
    public List<AttendanceSummaryResponse> getAttendanceReport(
            String subjectType,
            Optional<Integer> month,
            Optional<Integer> year,
            Optional<String> startDate,
            Optional<String> endDate) {

        if (startDate.isPresent() && endDate.isPresent()) {
            return getAttendanceReportByRange(subjectType, startDate.get(), endDate.get());
        }

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
     * Backward-compatible overload used by the CSV export path (no date range).
     */
    public List<AttendanceSummaryResponse> getAttendanceReport(
            String subjectType, Optional<Integer> month, Optional<Integer> year) {
        return getAttendanceReport(subjectType, month, year, Optional.empty(), Optional.empty());
    }

    /**
     * Aggregates monthly summaries per subject across the inclusive month span implied by
     * [startDate, endDate]. The projection is month/year granularity, so the range is applied
     * at month resolution (YYYYMM), not per-day.
     */
    private List<AttendanceSummaryResponse> getAttendanceReportByRange(
            String subjectType, String startDate, String endDate) {

        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        int startKey = start.getYear() * 100 + start.getMonthValue();
        int endKey = end.getYear() * 100 + end.getMonthValue();
        int lo = Math.min(startKey, endKey);
        int hi = Math.max(startKey, endKey);

        List<AttendanceSummary> inRange = attendanceSummaryRepository.findAll().stream()
                .filter(s -> s.getSubjectType().equalsIgnoreCase(subjectType))
                .filter(s -> {
                    if (s.getAttendanceYear() == null || s.getAttendanceMonth() == null) return false;
                    int key = s.getAttendanceYear() * 100 + s.getAttendanceMonth();
                    return key >= lo && key <= hi;
                })
                .collect(Collectors.toList());

        Map<UUID, List<AttendanceSummary>> bySubject = inRange.stream()
                .collect(Collectors.groupingBy(AttendanceSummary::getSubjectId,
                        java.util.LinkedHashMap::new, Collectors.toList()));

        return bySubject.values().stream()
                .map(rows -> {
                    AttendanceSummary first = rows.get(0);
                    int total = rows.stream().mapToInt(r -> r.getTotalDays() == null ? 0 : r.getTotalDays()).sum();
                    int present = rows.stream().mapToInt(r -> r.getPresentDays() == null ? 0 : r.getPresentDays()).sum();
                    int absent = rows.stream().mapToInt(r -> r.getAbsentDays() == null ? 0 : r.getAbsentDays()).sum();
                    int leave = rows.stream().mapToInt(r -> r.getLeaveDays() == null ? 0 : r.getLeaveDays()).sum();
                    return AttendanceSummaryResponse.builder()
                            .subjectType(first.getSubjectType())
                            .subjectId(first.getSubjectId())
                            .subjectName(first.getSubjectName())
                            .courseId(first.getCourseId())
                            .courseName(first.getCourseName())
                            .totalDays(total)
                            .presentDays(present)
                            .absentDays(absent)
                            .leaveDays(leave)
                            .attendancePercentage(pct(present, total))
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Returns subjects whose attendance percentage falls below the given threshold.
     * Percentage = presentDays / totalDays * 100 (rows with totalDays=0 are excluded).
     */
    public List<AttendanceExceptionResponse> getAttendanceExceptions(
            double threshold, String subjectType, Optional<Integer> month, Optional<Integer> year) {

        List<AttendanceSummary> summaries;
        if (month.isPresent() && year.isPresent()) {
            summaries = attendanceSummaryRepository
                    .findByAttendanceMonthAndAttendanceYear(month.get(), year.get());
        } else {
            summaries = attendanceSummaryRepository.findAll();
        }

        return summaries.stream()
                .filter(s -> subjectType == null || s.getSubjectType().equalsIgnoreCase(subjectType))
                .filter(s -> s.getTotalDays() != null && s.getTotalDays() > 0)
                .map(s -> {
                    double pct = pct(s.getPresentDays(), s.getTotalDays());
                    return AttendanceExceptionResponse.builder()
                            .subjectId(s.getSubjectId())
                            .subjectName(s.getSubjectName())
                            .subjectType(s.getSubjectType())
                            .attendanceMonth(s.getAttendanceMonth())
                            .attendanceYear(s.getAttendanceYear())
                            .totalDays(s.getTotalDays())
                            .presentDays(s.getPresentDays())
                            .attendancePercentage(pct)
                            .build();
                })
                .filter(r -> r.getAttendancePercentage() < threshold)
                .collect(Collectors.toList());
    }

    /**
     * Groups STUDENT attendance summaries by course for a given month/year.
     * Rows without a course fall into an "Unassigned" bucket.
     */
    public List<CourseAttendanceSummaryResponse> getMonthlyCourseSummary(Integer month, Integer year) {
        List<AttendanceSummary> summaries = attendanceSummaryRepository
                .findByAttendanceMonthAndAttendanceYear(month, year)
                .stream()
                .filter(s -> "STUDENT".equalsIgnoreCase(s.getSubjectType()))
                .collect(Collectors.toList());

        Map<UUID, List<AttendanceSummary>> byCourse = summaries.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCourseId(),
                        java.util.LinkedHashMap::new,
                        Collectors.toList()));

        // groupingBy cannot key on null, so handle unassigned separately
        List<AttendanceSummary> unassigned = summaries.stream()
                .filter(s -> s.getCourseId() == null)
                .collect(Collectors.toList());
        byCourse.remove(null);

        List<CourseAttendanceSummaryResponse> result = byCourse.entrySet().stream()
                .map(e -> buildCourseSummary(e.getKey(), courseName(e.getValue()), e.getValue(), month, year))
                .collect(Collectors.toList());

        if (!unassigned.isEmpty()) {
            result.add(buildCourseSummary(null, "Unassigned", unassigned, month, year));
        }
        return result;
    }

    /**
     * Builds a CSV representation of the attendance report for the given subject type.
     */
    public String exportAttendanceCsv(String subjectType, Optional<Integer> month, Optional<Integer> year) {
        List<AttendanceSummaryResponse> rows = getAttendanceReport(subjectType, month, year);
        StringBuilder sb = new StringBuilder();
        sb.append("Name,Total,Present,Absent,Leave,Attendance%\n");
        for (AttendanceSummaryResponse r : rows) {
            double pct = pct(r.getPresentDays(), r.getTotalDays());
            sb.append(csv(r.getSubjectName())).append(',')
              .append(r.getTotalDays()).append(',')
              .append(r.getPresentDays()).append(',')
              .append(r.getAbsentDays()).append(',')
              .append(r.getLeaveDays()).append(',')
              .append(pct).append('\n');
        }
        return sb.toString();
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
                .courseId(s.getCourseId())
                .courseName(s.getCourseName())
                .attendanceMonth(s.getAttendanceMonth())
                .attendanceYear(s.getAttendanceYear())
                .totalDays(s.getTotalDays())
                .presentDays(s.getPresentDays())
                .absentDays(s.getAbsentDays())
                .leaveDays(s.getLeaveDays())
                .attendancePercentage(pct(s.getPresentDays(), s.getTotalDays()))
                .build();
    }

    private CourseAttendanceSummaryResponse buildCourseSummary(
            UUID courseId, String courseName, List<AttendanceSummary> rows, Integer month, Integer year) {
        long present = rows.stream().mapToLong(r -> r.getPresentDays() == null ? 0 : r.getPresentDays()).sum();
        long total = rows.stream().mapToLong(r -> r.getTotalDays() == null ? 0 : r.getTotalDays()).sum();
        return CourseAttendanceSummaryResponse.builder()
                .courseId(courseId)
                .courseName(courseName)
                .attendanceMonth(month)
                .attendanceYear(year)
                .studentCount(rows.size())
                .totalDays(total)
                .presentDays(present)
                .attendancePercentage(pct(present, total))
                .build();
    }

    private String courseName(List<AttendanceSummary> rows) {
        return rows.stream()
                .map(AttendanceSummary::getCourseName)
                .filter(n -> n != null && !n.isBlank())
                .findFirst()
                .orElse("Unassigned");
    }

    private double pct(long present, long total) {
        if (total <= 0) return 0.0;
        return Math.round((present * 100.0 / total) * 10.0) / 10.0;
    }

    private double pct(Integer present, Integer total) {
        return pct(present == null ? 0 : present, total == null ? 0 : total);
    }

    private String csv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
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
