package com.artacademy.userservice.mapper;

import com.artacademy.userservice.domain.Student;
import com.artacademy.userservice.dto.StudentRequest;
import com.artacademy.userservice.dto.StudentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentMapper {

    Student toEntity(StudentRequest request);

    StudentResponse toResponse(Student student);

    void updateEntityFromRequest(StudentRequest request, @MappingTarget Student student);
}
