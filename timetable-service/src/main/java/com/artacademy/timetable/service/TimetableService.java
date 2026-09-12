package com.artacademy.timetable.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.TimetableGeneratedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.timetable.domain.Room;
import com.artacademy.timetable.domain.Timetable;
import com.artacademy.timetable.dto.GenerateTimetableRequest;
import com.artacademy.timetable.dto.RoomAvailabilityResponse;
import com.artacademy.timetable.dto.TimetableConflictResponse;
import com.artacademy.timetable.dto.TimetableRequest;
import com.artacademy.timetable.dto.TimetableResponse;
import com.artacademy.timetable.dto.UpcomingClassResponse;
import com.artacademy.timetable.mapper.TimetableMapper;
import com.artacademy.timetable.repository.RoomRepository;
import com.artacademy.timetable.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final RoomRepository roomRepository;
    private final RoomService roomService;
    private final TimetableMapper timetableMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final LocalTime DAY_START = LocalTime.of(8, 0);
    private static final LocalTime DAY_END = LocalTime.of(20, 0);

    @Transactional(readOnly = true)
    public List<TimetableResponse> getAllTimetables() {
        return timetableRepository.findAll().stream()
                .map(timetableMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TimetableResponse getById(UUID id) {
        return timetableMapper.toResponse(findTimetableById(id));
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getByTeacher(UUID teacherId) {
        return timetableRepository.findByTeacherId(teacherId).stream()
                .map(timetableMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getByClass(UUID classId) {
        return timetableRepository.findByClassId(classId).stream()
                .map(timetableMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getByStudent(UUID studentId, List<UUID> classIds) {
        if (classIds == null || classIds.isEmpty()) {
            return List.of();
        }
        return timetableRepository.findByClassIdIn(classIds).stream()
                .map(timetableMapper::toResponse)
                .toList();
    }

    @Transactional
    public TimetableResponse createTimetable(TimetableRequest request) {
        validateSlotWindow(request.getStartTime(), request.getEndTime());
        Room room = roomService.findRoomById(request.getRoomId());
        validateTeacherConflict(request.getTeacherId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), null);
        validateRoomConflict(room.getId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), null);

        Timetable timetable = Timetable.builder()
                .classId(request.getClassId())
                .teacherId(request.getTeacherId())
                .room(room)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .dayOfWeek(request.getDayOfWeek())
                .build();

        timetable = timetableRepository.save(timetable);

        publishTimetableGeneratedEvent(timetable);

        return timetableMapper.toResponse(timetable);
    }

    @Transactional
    public TimetableResponse updateTimetable(UUID id, TimetableRequest request) {
        validateSlotWindow(request.getStartTime(), request.getEndTime());
        Timetable existing = findTimetableById(id);
        Room room = roomService.findRoomById(request.getRoomId());

        validateTeacherConflict(request.getTeacherId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), id);
        validateRoomConflict(room.getId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), id);

        existing.setClassId(request.getClassId());
        existing.setTeacherId(request.getTeacherId());
        existing.setRoom(room);
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());
        existing.setDayOfWeek(request.getDayOfWeek());

        existing = timetableRepository.save(existing);

        publishTimetableUpdatedEvent(existing);

        return timetableMapper.toResponse(existing);
    }

    @Transactional
    public void deleteTimetable(UUID id) {
        if (!timetableRepository.existsById(id)) {
            throw ApiException.notFound("Timetable not found with id: " + id);
        }
        timetableRepository.deleteById(id);
    }

    @Transactional
    public List<TimetableResponse> generateTimetables(GenerateTimetableRequest request) {
        List<TimetableResponse> results = new ArrayList<>();
        // Pack sessions from 08:00 forward, with an independent cursor per weekday so that
        // items on different days each start at DAY_START rather than continuing from the
        // running total of previously placed items.
        java.util.Map<DayOfWeek, LocalTime> slotStartByDay = new java.util.EnumMap<>(DayOfWeek.class);

        for (GenerateTimetableRequest.TimetableItem item : request.getItems()) {
            DayOfWeek day = item.getPreferredDayOfWeek();
            LocalTime slotStart = slotStartByDay.getOrDefault(day, DAY_START);
            LocalTime slotEnd = slotStart.plusMinutes(item.getDurationMinutes());

            if (slotEnd.isAfter(DAY_END) || !slotEnd.isAfter(slotStart)) {
                throw ApiException.badRequest(
                        "Cannot fit class " + item.getClassId() + " on " + day +
                        ": slot " + slotStart + "-" + slotEnd + " exceeds the working-day window "
                        + DAY_START + "-" + DAY_END);
            }

            // Find a room with sufficient capacity (capacity >= 1 used as a proxy; actual
            // student count is not available here, so we pick the first available room)
            List<Room> candidateRooms = roomRepository.findByCapacityGreaterThanEqual(1);
            if (candidateRooms.isEmpty()) {
                throw ApiException.badRequest("No rooms available for the timetable");
            }

            Room assignedRoom = null;
            for (Room candidate : candidateRooms) {
                List<Timetable> roomConflicts = timetableRepository.findConflictingRoomTimetables(
                        candidate.getId(), day, slotStart, slotEnd);
                if (roomConflicts.isEmpty()) {
                    assignedRoom = candidate;
                    break;
                }
            }

            if (assignedRoom == null) {
                throw ApiException.conflict(
                        "No available room found for class " + item.getClassId() +
                        " on " + day + " at " + slotStart);
            }

            List<Timetable> teacherConflicts = timetableRepository.findConflictingTeacherTimetables(
                    item.getTeacherId(), day, slotStart, slotEnd);
            if (!teacherConflicts.isEmpty()) {
                throw ApiException.conflict(
                        "Teacher " + item.getTeacherId() + " has a conflicting timetable on " +
                        day + " at " + slotStart);
            }

            Timetable timetable = Timetable.builder()
                    .classId(item.getClassId())
                    .teacherId(item.getTeacherId())
                    .room(assignedRoom)
                    .startTime(slotStart)
                    .endTime(slotEnd)
                    .dayOfWeek(day)
                    .build();

            timetable = timetableRepository.save(timetable);
            publishTimetableGeneratedEvent(timetable);
            results.add(timetableMapper.toResponse(timetable));

            // Advance this day's cursor to the end of the placed slot for the next item on the same day.
            slotStartByDay.put(day, slotEnd);
        }

        return results;
    }

    // -------------------------------------------------------------------------
    // Room availability
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public RoomAvailabilityResponse getRoomAvailability(UUID roomId, DayOfWeek day) {
        Room room = roomService.findRoomById(roomId);
        List<Timetable> dayTimetables = timetableRepository
                .findByRoomIdAndDayOfWeek(roomId, day).stream()
                .sorted(Comparator.comparing(Timetable::getStartTime))
                .toList();

        List<RoomAvailabilityResponse.Slot> occupied = new ArrayList<>();
        for (Timetable s : dayTimetables) {
            occupied.add(RoomAvailabilityResponse.Slot.builder()
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .timetableId(s.getId())
                    .classId(s.getClassId())
                    .build());
        }

        List<RoomAvailabilityResponse.Slot> free = new ArrayList<>();
        LocalTime cursor = DAY_START;
        for (Timetable s : dayTimetables) {
            LocalTime start = s.getStartTime().isBefore(DAY_START) ? DAY_START : s.getStartTime();
            if (start.isAfter(cursor)) {
                free.add(RoomAvailabilityResponse.Slot.builder()
                        .startTime(cursor)
                        .endTime(start)
                        .build());
            }
            if (s.getEndTime().isAfter(cursor)) {
                cursor = s.getEndTime();
            }
        }
        if (cursor.isBefore(DAY_END)) {
            free.add(RoomAvailabilityResponse.Slot.builder()
                    .startTime(cursor)
                    .endTime(DAY_END)
                    .build());
        }

        return RoomAvailabilityResponse.builder()
                .roomId(room.getId())
                .roomName(room.getRoomName())
                .dayOfWeek(day)
                .occupied(occupied)
                .free(free)
                .build();
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
                if (a.getRoom().getId().equals(b.getRoom().getId())) {
                    conflicts.add(buildConflict(TimetableConflictResponse.ConflictType.ROOM_DOUBLE_BOOKED,
                            a, b, overlapStart, overlapEnd,
                            "Room " + a.getRoom().getRoomName() + " double-booked"));
                }
                if (a.getClassId().equals(b.getClassId())) {
                    conflicts.add(buildConflict(TimetableConflictResponse.ConflictType.CLASS_OVERLAP,
                            a, b, overlapStart, overlapEnd,
                            "Class " + a.getClassId() + " overlaps with itself"));
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
                .roomId(a.getRoom().getId())
                .classId(a.getClassId())
                .description(description)
                .build();
    }

    // -------------------------------------------------------------------------
    // Upcoming classes
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<UpcomingClassResponse> getUpcoming(List<UUID> classIds, int limit) {
        if (classIds == null || classIds.isEmpty()) {
            return List.of();
        }
        List<Timetable> timetables = timetableRepository.findByClassIdIn(classIds);
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
                            .classId(s.getClassId())
                            .teacherId(s.getTeacherId())
                            .roomId(s.getRoom().getId())
                            .roomName(s.getRoom().getRoomName())
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
    private void validateTeacherConflict(UUID teacherId, java.time.DayOfWeek day,
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

    /**
     * Validates that the given room has no overlapping timetable on the same day.
     */
    private void validateRoomConflict(UUID roomId, java.time.DayOfWeek day,
                                       LocalTime start, LocalTime end, UUID excludeId) {
        List<Timetable> conflicts = timetableRepository.findConflictingRoomTimetables(
                roomId, day, start, end);
        List<Timetable> filtered = conflicts.stream()
                .filter(s -> excludeId == null || !s.getId().equals(excludeId))
                .toList();
        if (!filtered.isEmpty()) {
            throw ApiException.conflict(
                    "Room " + roomId + " is already booked on " + day +
                    " during " + start + " - " + end);
        }
    }

    private void publishTimetableGeneratedEvent(Timetable timetable) {
        TimetableGeneratedEvent event = TimetableGeneratedEvent.builder()
                .timetableId(timetable.getId())
                .classId(timetable.getClassId())
                .teacherId(timetable.getTeacherId())
                .roomId(timetable.getRoom().getId())
                .dayOfWeek(timetable.getDayOfWeek().name())
                .startTime(timetable.getStartTime().toString())
                .endTime(timetable.getEndTime().toString())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.TIMETABLE_GENERATED, String.valueOf(timetable.getId()), event);
        log.info("Published TimetableGeneratedEvent for timetable id={}", timetable.getId());
    }

    private void publishTimetableUpdatedEvent(Timetable timetable) {
        TimetableGeneratedEvent event = TimetableGeneratedEvent.builder()
                .timetableId(timetable.getId())
                .classId(timetable.getClassId())
                .teacherId(timetable.getTeacherId())
                .roomId(timetable.getRoom().getId())
                .dayOfWeek(timetable.getDayOfWeek().name())
                .startTime(timetable.getStartTime().toString())
                .endTime(timetable.getEndTime().toString())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.TIMETABLE_UPDATED, String.valueOf(timetable.getId()), event);
        log.info("Published TimetableUpdatedEvent for timetable id={}", timetable.getId());
    }
}
