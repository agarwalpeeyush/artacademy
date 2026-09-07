package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.dto.CourseRequest;
import com.artacademy.courseenrollment.dto.CourseResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    Course toEntity(CourseRequest request);

    CourseResponse toResponse(Course course);

    void updateEntityFromRequest(CourseRequest request, @MappingTarget Course course);
}
