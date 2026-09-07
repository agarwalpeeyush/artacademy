package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.CourseClass;
import com.artacademy.courseenrollment.dto.ClassRequest;
import com.artacademy.courseenrollment.dto.ClassResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ClassMapper {

    CourseClass toEntity(ClassRequest request);

    ClassResponse toResponse(CourseClass courseClass);

    void updateEntityFromRequest(ClassRequest request, @MappingTarget CourseClass courseClass);
}
