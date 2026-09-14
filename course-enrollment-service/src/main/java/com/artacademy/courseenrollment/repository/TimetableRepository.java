package com.artacademy.courseenrollment.repository;

import com.artacademy.courseenrollment.domain.Timetable;
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

    List<Timetable> findByCourseId(UUID courseId);

    List<Timetable> findByCourseIdIn(List<UUID> courseIds);

    @Query("SELECT s FROM Timetable s WHERE s.teacherId = :teacherId AND s.dayOfWeek = :day " +
           "AND s.startTime < :end AND s.endTime > :start")
    List<Timetable> findConflictingTeacherTimetables(
            @Param("teacherId") UUID teacherId,
            @Param("day") DayOfWeek day,
            @Param("start") LocalTime start,
            @Param("end") LocalTime end);
}
