package com.artacademy.timetable.mapper;

import com.artacademy.timetable.domain.Timetable;
import com.artacademy.timetable.dto.TimetableResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TimetableMapper {

    @Mapping(source = "room.id", target = "roomId")
    @Mapping(source = "room.roomName", target = "roomName")
    TimetableResponse toResponse(Timetable timetable);
}
