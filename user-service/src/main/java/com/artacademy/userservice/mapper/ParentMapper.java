package com.artacademy.userservice.mapper;

import com.artacademy.common.exception.ApiException;
import com.artacademy.userservice.domain.Parent;
import com.artacademy.userservice.domain.Relationship;
import com.artacademy.userservice.dto.ParentRequest;
import com.artacademy.userservice.dto.ParentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface ParentMapper {

    @Mapping(target = "children", ignore = true)
    @Mapping(target = "relationship", source = "relationship", qualifiedByName = "toRelationship")
    Parent toEntity(ParentRequest request);

    @Mapping(target = "children", ignore = true)
    @Mapping(target = "relationship", source = "relationship", qualifiedByName = "fromRelationship")
    ParentResponse toResponse(Parent parent);

    @Mapping(target = "children", ignore = true)
    @Mapping(target = "loginId", ignore = true)
    @Mapping(target = "relationship", source = "relationship", qualifiedByName = "toRelationship")
    void updateEntityFromRequest(ParentRequest request, @MappingTarget Parent parent);

    @Named("toRelationship")
    default Relationship toRelationship(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Relationship.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Invalid relationship: '" + value + "'");
        }
    }

    @Named("fromRelationship")
    default String fromRelationship(Relationship value) {
        return value == null ? null : value.name();
    }
}
