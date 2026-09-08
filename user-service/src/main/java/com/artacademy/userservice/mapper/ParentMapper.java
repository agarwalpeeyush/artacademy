package com.artacademy.userservice.mapper;

import com.artacademy.userservice.domain.Parent;
import com.artacademy.userservice.dto.ParentRequest;
import com.artacademy.userservice.dto.ParentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ParentMapper {

    Parent toEntity(ParentRequest request);

    @Mapping(target = "studentName", ignore = true)
    ParentResponse toResponse(Parent parent);

    void updateEntityFromRequest(ParentRequest request, @MappingTarget Parent parent);
}
