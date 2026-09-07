package com.artacademy.scheduling.service;

import com.artacademy.common.events.KafkaTopics;
import com.artacademy.common.events.ScheduleGeneratedEvent;
import com.artacademy.common.exception.ApiException;
import com.artacademy.scheduling.domain.Room;
import com.artacademy.scheduling.domain.Schedule;
import com.artacademy.scheduling.dto.GenerateScheduleRequest;
import com.artacademy.scheduling.dto.ScheduleRequest;
import com.artacademy.scheduling.dto.ScheduleResponse;
import com.artacademy.scheduling.mapper.ScheduleMapper;
import com.artacademy.scheduling.repository.RoomRepository;
import com.artacademy.scheduling.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final RoomRepository roomRepository;
    private final RoomService roomService;
    private final ScheduleMapper scheduleMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public List<ScheduleResponse> getAllSchedules() {
        return scheduleRepository.findAll().stream()
                .map(scheduleMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ScheduleResponse getById(UUID id) {
        return scheduleMapper.toResponse(findScheduleById(id));
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> getByTeacher(UUID teacherId) {
        return scheduleRepository.findByTeacherId(teacherId).stream()
                .map(scheduleMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> getByStudent(UUID studentId, List<UUID> classIds) {
        return scheduleRepository.findByClassIdIn(classIds).stream()
                .map(scheduleMapper::toResponse)
                .toList();
    }

    @Transactional
    public ScheduleResponse createSchedule(ScheduleRequest request) {
        Room room = roomService.findRoomById(request.getRoomId());
        validateTeacherConflict(request.getTeacherId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), null);
        validateRoomConflict(room.getId(), request.getDayOfWeek(), request.getStartTime(),
                request.getEndTime(), null);

        Schedule schedule = Schedule.builder()
                .classId(request.getClassId())
                .teacherId(request.getTeacherId())
                .room(room)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .dayOfWeek(request.getDayOfWeek())
                .build();

        schedule = scheduleRepository.save(schedule);

        publishScheduleGeneratedEvent(schedule);

        return scheduleMapper.toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse updateSchedule(UUID id, ScheduleRequest request) {
        Schedule existing = findScheduleById(id);
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

        existing = scheduleRepository.save(existing);

        publishScheduleUpdatedEvent(existing);

        return scheduleMapper.toResponse(existing);
    }

    @Transactional
    public void deleteSchedule(UUID id) {
        if (!scheduleRepository.existsById(id)) {
            throw ApiException.notFound("Schedule not found with id: " + id);
        }
        scheduleRepository.deleteById(id);
    }

    @Transactional
    public List<ScheduleResponse> generateSchedules(GenerateScheduleRequest request) {
        List<ScheduleResponse> results = new ArrayList<>();
        // Start assigning from 08:00 and move forward for each slot on the preferred day
        LocalTime slotStart = LocalTime.of(8, 0);

        for (GenerateScheduleRequest.ScheduleItem item : request.getItems()) {
            LocalTime slotEnd = slotStart.plusMinutes(item.getDurationMinutes());

            // Find a room with sufficient capacity (capacity >= 1 used as a proxy; actual
            // student count is not available here, so we pick the first available room)
            List<Room> candidateRooms = roomRepository.findByCapacityGreaterThanEqual(1);
            if (candidateRooms.isEmpty()) {
                throw ApiException.badRequest("No rooms available for scheduling");
            }

            Room assignedRoom = null;
            for (Room candidate : candidateRooms) {
                List<Schedule> roomConflicts = scheduleRepository.findConflictingRoomSchedules(
                        candidate.getId(), item.getPreferredDayOfWeek(), slotStart, slotEnd);
                if (roomConflicts.isEmpty()) {
                    assignedRoom = candidate;
                    break;
                }
            }

            if (assignedRoom == null) {
                throw ApiException.conflict(
                        "No available room found for class " + item.getClassId() +
                        " on " + item.getPreferredDayOfWeek() + " at " + slotStart);
            }

            List<Schedule> teacherConflicts = scheduleRepository.findConflictingTeacherSchedules(
                    item.getTeacherId(), item.getPreferredDayOfWeek(), slotStart, slotEnd);
            if (!teacherConflicts.isEmpty()) {
                throw ApiException.conflict(
                        "Teacher " + item.getTeacherId() + " has a conflicting schedule on " +
                        item.getPreferredDayOfWeek() + " at " + slotStart);
            }

            Schedule schedule = Schedule.builder()
                    .classId(item.getClassId())
                    .teacherId(item.getTeacherId())
                    .room(assignedRoom)
                    .startTime(slotStart)
                    .endTime(slotEnd)
                    .dayOfWeek(item.getPreferredDayOfWeek())
                    .build();

            schedule = scheduleRepository.save(schedule);
            publishScheduleGeneratedEvent(schedule);
            results.add(scheduleMapper.toResponse(schedule));

            // Advance slot start to end of this slot for the next item
            slotStart = slotEnd;
        }

        return results;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Schedule findScheduleById(UUID id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Schedule not found with id: " + id));
    }

    /**
     * Validates that the given teacher has no overlapping schedule on the same day.
     * Pass {@code excludeId} as the current schedule's id when updating (so self-overlap
     * is not counted); pass {@code null} when creating.
     */
    private void validateTeacherConflict(UUID teacherId, java.time.DayOfWeek day,
                                          LocalTime start, LocalTime end, UUID excludeId) {
        List<Schedule> conflicts = scheduleRepository.findConflictingTeacherSchedules(
                teacherId, day, start, end);
        List<Schedule> filtered = conflicts.stream()
                .filter(s -> excludeId == null || !s.getId().equals(excludeId))
                .toList();
        if (!filtered.isEmpty()) {
            throw ApiException.conflict(
                    "Teacher " + teacherId + " already has a schedule on " + day +
                    " that overlaps with " + start + " - " + end);
        }
    }

    /**
     * Validates that the given room has no overlapping schedule on the same day.
     */
    private void validateRoomConflict(UUID roomId, java.time.DayOfWeek day,
                                       LocalTime start, LocalTime end, UUID excludeId) {
        List<Schedule> conflicts = scheduleRepository.findConflictingRoomSchedules(
                roomId, day, start, end);
        List<Schedule> filtered = conflicts.stream()
                .filter(s -> excludeId == null || !s.getId().equals(excludeId))
                .toList();
        if (!filtered.isEmpty()) {
            throw ApiException.conflict(
                    "Room " + roomId + " is already booked on " + day +
                    " during " + start + " - " + end);
        }
    }

    private void publishScheduleGeneratedEvent(Schedule schedule) {
        ScheduleGeneratedEvent event = ScheduleGeneratedEvent.builder()
                .scheduleId(schedule.getId())
                .classId(schedule.getClassId())
                .teacherId(schedule.getTeacherId())
                .roomId(schedule.getRoom().getId())
                .dayOfWeek(schedule.getDayOfWeek().name())
                .startTime(schedule.getStartTime().toString())
                .endTime(schedule.getEndTime().toString())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.SCHEDULE_GENERATED, String.valueOf(schedule.getId()), event);
        log.info("Published ScheduleGeneratedEvent for schedule id={}", schedule.getId());
    }

    private void publishScheduleUpdatedEvent(Schedule schedule) {
        ScheduleGeneratedEvent event = ScheduleGeneratedEvent.builder()
                .scheduleId(schedule.getId())
                .classId(schedule.getClassId())
                .teacherId(schedule.getTeacherId())
                .roomId(schedule.getRoom().getId())
                .dayOfWeek(schedule.getDayOfWeek().name())
                .startTime(schedule.getStartTime().toString())
                .endTime(schedule.getEndTime().toString())
                .occurredAt(Instant.now())
                .build();
        kafkaTemplate.send(KafkaTopics.SCHEDULE_UPDATED, String.valueOf(schedule.getId()), event);
        log.info("Published ScheduleUpdatedEvent for schedule id={}", schedule.getId());
    }
}
