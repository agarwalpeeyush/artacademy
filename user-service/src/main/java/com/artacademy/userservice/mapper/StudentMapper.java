package com.artacademy.userservice.mapper;

import com.artacademy.userservice.domain.Student;
import com.artacademy.userservice.dto.StudentRequest;
import com.artacademy.userservice.dto.StudentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentMapper {

    @Mapping(target = "parents", ignore = true)
    Student toEntity(StudentRequest request);

    @Mapping(target = "parents", ignore = true)
    StudentResponse toResponse(Student student);

    @Mapping(target = "parents", ignore = true)
    @Mapping(target = "loginId", ignore = true)
    void updateEntityFromRequest(StudentRequest request, @MappingTarget Student student);
}
