package com.artacademy.courseenrollment.attendance.mapper;

import com.artacademy.courseenrollment.attendance.domain.StudentAttendance;
import com.artacademy.courseenrollment.attendance.dto.StudentAttendanceRequest;
import com.artacademy.courseenrollment.attendance.dto.StudentAttendanceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentAttendanceMapper {

    StudentAttendance toEntity(StudentAttendanceRequest request);

    StudentAttendanceResponse toResponse(StudentAttendance entity);

    void updateEntityFromRequest(StudentAttendanceRequest request, @MappingTarget StudentAttendance entity);
}
