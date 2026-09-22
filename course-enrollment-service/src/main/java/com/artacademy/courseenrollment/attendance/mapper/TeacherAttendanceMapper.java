package com.artacademy.courseenrollment.attendance.mapper;

import com.artacademy.courseenrollment.attendance.domain.TeacherAttendance;
import com.artacademy.courseenrollment.attendance.dto.TeacherAttendanceRequest;
import com.artacademy.courseenrollment.attendance.dto.TeacherAttendanceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TeacherAttendanceMapper {

    TeacherAttendance toEntity(TeacherAttendanceRequest request);

    TeacherAttendanceResponse toResponse(TeacherAttendance entity);

    void updateEntityFromRequest(TeacherAttendanceRequest request, @MappingTarget TeacherAttendance entity);
}
