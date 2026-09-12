package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.CourseClass;
import com.artacademy.courseenrollment.dto.ClassRequest;
import com.artacademy.courseenrollment.dto.ClassResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ClassMapper {

    CourseClass toEntity(ClassRequest request);

    ClassResponse toResponse(CourseClass courseClass);

    // COURSE_ID is fixed at creation: a class cannot be reparented to another course on update.
    @Mapping(target = "courseId", ignore = true)
    void updateEntityFromRequest(ClassRequest request, @MappingTarget CourseClass courseClass);
}
