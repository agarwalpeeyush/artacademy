package com.artacademy.timetable.repository;

import com.artacademy.timetable.domain.Timetable;
import com.artacademy.timetable.domain.TimetableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, UUID> {

    List<Timetable> findByTeacherId(UUID teacherId);

    List<Timetable> findByClassId(UUID classId);

    List<Timetable> findByRoomId(UUID roomId);           // Spring Data traverses room.id

    List<Timetable> findByRoomIdAndDayOfWeek(UUID roomId, DayOfWeek dayOfWeek); // room.id + dayOfWeek

    List<Timetable> findByTeacherIdAndDayOfWeek(UUID teacherId, DayOfWeek dayOfWeek);

    List<Timetable> findByClassIdIn(List<UUID> classIds);

    List<Timetable> findByStatus(TimetableStatus status);

    List<Timetable> findByTeacherIdAndStatus(UUID teacherId, TimetableStatus status);

    List<Timetable> findByClassIdInAndStatus(List<UUID> classIds, TimetableStatus status);

    List<Timetable> findByClassIdAndStatus(UUID classId, TimetableStatus status);

    List<Timetable> findByRoomIdAndDayOfWeekAndStatus(UUID roomId, DayOfWeek dayOfWeek, TimetableStatus status);

    @Query("SELECT s FROM Timetable s WHERE s.teacherId = :teacherId AND s.dayOfWeek = :day " +
           "AND s.startTime < :end AND s.endTime > :start")
    List<Timetable> findConflictingTeacherTimetables(
            @Param("teacherId") UUID teacherId,
            @Param("day") DayOfWeek day,
            @Param("start") LocalTime start,
            @Param("end") LocalTime end);

    @Query("SELECT s FROM Timetable s WHERE s.room.id = :roomId AND s.dayOfWeek = :day " +
           "AND s.startTime < :end AND s.endTime > :start")
    List<Timetable> findConflictingRoomTimetables(
            @Param("roomId") UUID roomId,
            @Param("day") DayOfWeek day,
            @Param("start") LocalTime start,
            @Param("end") LocalTime end);
}
