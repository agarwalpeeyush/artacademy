package com.artacademy.attendance.mapper;

import com.artacademy.attendance.domain.StudentAttendance;
import com.artacademy.attendance.dto.StudentAttendanceRequest;
import com.artacademy.attendance.dto.StudentAttendanceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentAttendanceMapper {

    StudentAttendance toEntity(StudentAttendanceRequest request);

    StudentAttendanceResponse toResponse(StudentAttendance entity);

    void updateEntityFromRequest(StudentAttendanceRequest request, @MappingTarget StudentAttendance entity);
}
