package com.artacademy.attendance.mapper;

import com.artacademy.attendance.domain.TeacherAttendance;
import com.artacademy.attendance.dto.TeacherAttendanceRequest;
import com.artacademy.attendance.dto.TeacherAttendanceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TeacherAttendanceMapper {

    TeacherAttendance toEntity(TeacherAttendanceRequest request);

    TeacherAttendanceResponse toResponse(TeacherAttendance entity);

    void updateEntityFromRequest(TeacherAttendanceRequest request, @MappingTarget TeacherAttendance entity);
}
