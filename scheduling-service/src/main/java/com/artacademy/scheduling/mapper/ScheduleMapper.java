package com.artacademy.scheduling.mapper;

import com.artacademy.scheduling.domain.Schedule;
import com.artacademy.scheduling.dto.ScheduleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ScheduleMapper {

    @Mapping(source = "room.id", target = "roomId")
    @Mapping(source = "room.roomName", target = "roomName")
    ScheduleResponse toResponse(Schedule schedule);
}
