package com.artacademy.scheduling.repository;

import com.artacademy.scheduling.domain.Schedule;
import com.artacademy.scheduling.domain.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    List<Schedule> findByTeacherId(UUID teacherId);

    List<Schedule> findByClassId(UUID classId);

    List<Schedule> findByRoomId(UUID roomId);           // Spring Data traverses room.id

    List<Schedule> findByRoomIdAndDayOfWeek(UUID roomId, DayOfWeek dayOfWeek); // room.id + dayOfWeek

    List<Schedule> findByTeacherIdAndDayOfWeek(UUID teacherId, DayOfWeek dayOfWeek);

    List<Schedule> findByClassIdIn(List<UUID> classIds);

    List<Schedule> findByStatus(ScheduleStatus status);

    List<Schedule> findByTeacherIdAndStatus(UUID teacherId, ScheduleStatus status);

    List<Schedule> findByClassIdInAndStatus(List<UUID> classIds, ScheduleStatus status);

    List<Schedule> findByRoomIdAndDayOfWeekAndStatus(UUID roomId, DayOfWeek dayOfWeek, ScheduleStatus status);

    @Query("SELECT s FROM Schedule s WHERE s.teacherId = :teacherId AND s.dayOfWeek = :day " +
           "AND s.startTime < :end AND s.endTime > :start")
    List<Schedule> findConflictingTeacherSchedules(
            @Param("teacherId") UUID teacherId,
            @Param("day") DayOfWeek day,
            @Param("start") LocalTime start,
            @Param("end") LocalTime end);

    @Query("SELECT s FROM Schedule s WHERE s.room.id = :roomId AND s.dayOfWeek = :day " +
           "AND s.startTime < :end AND s.endTime > :start")
    List<Schedule> findConflictingRoomSchedules(
            @Param("roomId") UUID roomId,
            @Param("day") DayOfWeek day,
            @Param("start") LocalTime start,
            @Param("end") LocalTime end);
}
