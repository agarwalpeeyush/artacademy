package com.artacademy.courseenrollment.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.courseenrollment.client.UserServiceClient;
import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.domain.Timetable;
import com.artacademy.courseenrollment.dto.TimetableConflictResponse;
import com.artacademy.courseenrollment.dto.TimetableRequest;
import com.artacademy.courseenrollment.dto.TimetableResponse;
import com.artacademy.courseenrollment.dto.UpcomingClassResponse;
import com.artacademy.courseenrollment.mapper.TimetableMapper;
import com.artacademy.courseenrollment.repository.CourseRepository;
import com.artacademy.courseenrollment.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final TimetableMapper timetableMapper;
    private final UserServiceClient userServiceClient;
    private final CourseRepository courseRepository;

    private static final LocalTime DAY_START = LocalTime.of(8, 0);
    private static final LocalTime DAY_END = LocalTime.of(20, 0);

    @Transactional(readOnly = true)
    public List<TimetableResponse> getAllTimetables() {
        return enrich(timetableRepository.findAll().stream()
                .map(timetableMapper::toResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public TimetableResponse getById(UUID id) {
        return enrich(List.of(timetableMapper.toResponse(findTimetableById(id)))).get(0);
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getByTeacher(UUID teacherId) {
        return enrich(timetableRepository.findByTeacherId(teacherId).stream()
                .map(timetableMapper::toResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getByCourse(UUID courseId) {
        return enrich(timetableRepository.findByCourseId(courseId).stream()
                .map(timetableMapper::toResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getByStudent(UUID studentId, List<UUID> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return List.of();
        }
        return enrich(timetableRepository.findByCourseIdIn(courseIds).stream()
                .map(timetableMapper::toResponse)
                .toList());
    }

    /**
     * Populate {@code teacherName} (from user-service) and {@code courseName} (from the local
     * course table) on each response. One bulk lookup per source, per call.
     */
    private List<TimetableResponse> enrich(List<TimetableResponse> responses) {
        if (responses.isEmpty()) {
            return responses;
        }
        Map<UUID, String> teacherNames = userServiceClient.fetchTeacherNames();
        List<UUID> courseIds = responses.stream()
                .map(TimetableResponse::getCourseId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, String> courseNames = courseRepository.findAllById(courseIds).stream()
                .collect(java.util.stream.Collectors.toMap(Course::getId, Course::getCourseName));
        responses.forEach(r -> {
            r.setTeacherName(teacherNames.get(r.getTeacherId()));
            r.setCourseName(courseNames.get(r.getCourseId()));
        });
        return responses;
    }

    @Transactional
    public TimetableResponse createTimetable(TimetableRequest request) {
        validateSlotWindow(request.getStartTime(), request.getEndTime());
        validateTeacherConflict(request.getTeacherId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), null);

        Timetable timetable = Timetable.builder()
                .courseId(request.getCourseId())
                .teacherId(request.getTeacherId())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .dayOfWeek(request.getDayOfWeek())
                .build();

        timetable = timetableRepository.save(timetable);

        return timetableMapper.toResponse(timetable);
    }

    @Transactional
    public TimetableResponse updateTimetable(UUID id, TimetableRequest request) {
        validateSlotWindow(request.getStartTime(), request.getEndTime());
        Timetable existing = findTimetableById(id);

        validateTeacherConflict(request.getTeacherId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), id);

        existing.setCourseId(request.getCourseId());
        existing.setTeacherId(request.getTeacherId());
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());
        existing.setDayOfWeek(request.getDayOfWeek());

        existing = timetableRepository.save(existing);

        return timetableMapper.toResponse(existing);
    }

    @Transactional
    public void deleteTimetable(UUID id) {
        if (!timetableRepository.existsById(id)) {
            throw ApiException.notFound("Timetable not found with id: " + id);
        }
        timetableRepository.deleteById(id);
    }

    // -------------------------------------------------------------------------
    // Conflict dashboard
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TimetableConflictResponse> getConflicts() {
        List<Timetable> all = timetableRepository.findAll();
        List<TimetableConflictResponse> conflicts = new ArrayList<>();

        for (int i = 0; i < all.size(); i++) {
            for (int j = i + 1; j < all.size(); j++) {
                Timetable a = all.get(i);
                Timetable b = all.get(j);
                if (a.getDayOfWeek() != b.getDayOfWeek()) {
                    continue;
                }
                if (!overlaps(a.getStartTime(), a.getEndTime(), b.getStartTime(), b.getEndTime())) {
                    continue;
                }
                LocalTime overlapStart = max(a.getStartTime(), b.getStartTime());
                LocalTime overlapEnd = min(a.getEndTime(), b.getEndTime());

                if (a.getTeacherId().equals(b.getTeacherId())) {
                    conflicts.add(buildConflict(TimetableConflictResponse.ConflictType.TEACHER_DOUBLE_BOOKED,
                            a, b, overlapStart, overlapEnd,
                            "Teacher " + a.getTeacherId() + " double-booked"));
                }
                if (a.getCourseId().equals(b.getCourseId())) {
                    conflicts.add(buildConflict(TimetableConflictResponse.ConflictType.COURSE_OVERLAP,
                            a, b, overlapStart, overlapEnd,
                            "Course " + a.getCourseId() + " has overlapping slots"));
                }
            }
        }
        return conflicts;
    }

    private TimetableConflictResponse buildConflict(TimetableConflictResponse.ConflictType type,
                                                   Timetable a, Timetable b,
                                                   LocalTime start, LocalTime end, String description) {
        return TimetableConflictResponse.builder()
                .type(type)
                .dayOfWeek(a.getDayOfWeek())
                .startTime(start)
                .endTime(end)
                .timetableId(a.getId())
                .otherTimetableId(b.getId())
                .teacherId(a.getTeacherId())
                .courseId(a.getCourseId())
                .description(description)
                .build();
    }

    // -------------------------------------------------------------------------
    // Upcoming classes
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<UpcomingClassResponse> getUpcoming(List<UUID> courseIds, int limit) {
        if (courseIds == null || courseIds.isEmpty()) {
            return List.of();
        }
        List<Timetable> timetables = timetableRepository.findByCourseIdIn(courseIds);
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        return timetables.stream()
                .map(s -> {
                    LocalDate next = nextOccurrence(today, now, s.getDayOfWeek(), s.getStartTime());
                    return UpcomingClassResponse.builder()
                            .timetableId(s.getId())
                            .date(next)
                            .dayOfWeek(s.getDayOfWeek())
                            .startTime(s.getStartTime())
                            .endTime(s.getEndTime())
                            .courseId(s.getCourseId())
                            .teacherId(s.getTeacherId())
                            .build();
                })
                .sorted(Comparator.comparing(UpcomingClassResponse::getDate)
                        .thenComparing(UpcomingClassResponse::getStartTime))
                .limit(limit)
                .toList();
    }

    private LocalDate nextOccurrence(LocalDate today, LocalTime now, DayOfWeek target, LocalTime startTime) {
        int diff = (target.getValue() - today.getDayOfWeek().getValue() + 7) % 7;
        if (diff == 0 && !startTime.isAfter(now)) {
            diff = 7; // today's session already started/passed -> next week
        }
        return today.plusDays(diff);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private boolean overlaps(LocalTime aStart, LocalTime aEnd, LocalTime bStart, LocalTime bEnd) {
        return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
    }

    private LocalTime max(LocalTime a, LocalTime b) {
        return a.isAfter(b) ? a : b;
    }

    private LocalTime min(LocalTime a, LocalTime b) {
        return a.isBefore(b) ? a : b;
    }

    private Timetable findTimetableById(UUID id) {
        return timetableRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Timetable not found with id: " + id));
    }

    private void validateSlotWindow(LocalTime start, LocalTime end) {
        if (!start.isBefore(end)) {
            throw ApiException.badRequest(
                    "startTime (" + start + ") must be before endTime (" + end + ")");
        }
        if (start.isBefore(DAY_START) || end.isAfter(DAY_END)) {
            throw ApiException.badRequest(
                    "Session " + start + "-" + end + " must fall within the working-day window "
                    + DAY_START + "-" + DAY_END);
        }
    }

    /**
     * Validates that the given teacher has no overlapping timetable on the same day.
     * Pass {@code excludeId} as the current timetable's id when updating (so self-overlap
     * is not counted); pass {@code null} when creating.
     */
    private void validateTeacherConflict(UUID teacherId, DayOfWeek day,
                                          LocalTime start, LocalTime end, UUID excludeId) {
        List<Timetable> conflicts = timetableRepository.findConflictingTeacherTimetables(
                teacherId, day, start, end);
        List<Timetable> filtered = conflicts.stream()
                .filter(s -> excludeId == null || !s.getId().equals(excludeId))
                .toList();
        if (!filtered.isEmpty()) {
            throw ApiException.conflict(
                    "Teacher " + teacherId + " already has a timetable on " + day +
                    " that overlaps with " + start + " - " + end);
        }
    }
}
