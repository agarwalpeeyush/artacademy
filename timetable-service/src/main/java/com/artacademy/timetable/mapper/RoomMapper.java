package com.artacademy.timetable.mapper;

import com.artacademy.timetable.domain.Room;
import com.artacademy.timetable.dto.RoomRequest;
import com.artacademy.timetable.dto.RoomResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RoomMapper {

    Room toEntity(RoomRequest request);

    RoomResponse toResponse(Room room);

    void updateEntityFromRequest(RoomRequest request, @MappingTarget Room room);
}
