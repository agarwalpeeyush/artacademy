package com.artacademy.scheduling.mapper;

import com.artacademy.scheduling.domain.Room;
import com.artacademy.scheduling.dto.RoomRequest;
import com.artacademy.scheduling.dto.RoomResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RoomMapper {

    Room toEntity(RoomRequest request);

    RoomResponse toResponse(Room room);

    void updateEntityFromRequest(RoomRequest request, @MappingTarget Room room);
}
