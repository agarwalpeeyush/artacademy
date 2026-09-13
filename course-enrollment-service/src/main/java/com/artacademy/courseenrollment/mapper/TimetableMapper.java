package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.Timetable;
import com.artacademy.courseenrollment.dto.TimetableResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TimetableMapper {

    TimetableResponse toResponse(Timetable timetable);
}
