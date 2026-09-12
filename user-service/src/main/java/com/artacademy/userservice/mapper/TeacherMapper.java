package com.artacademy.userservice.mapper;

import com.artacademy.userservice.domain.Teacher;
import com.artacademy.userservice.dto.TeacherRequest;
import com.artacademy.userservice.dto.TeacherResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TeacherMapper {

    Teacher toEntity(TeacherRequest request);

    TeacherResponse toResponse(Teacher teacher);

    @Mapping(target = "loginId", ignore = true)
    void updateEntityFromRequest(TeacherRequest request, @MappingTarget Teacher teacher);
}
