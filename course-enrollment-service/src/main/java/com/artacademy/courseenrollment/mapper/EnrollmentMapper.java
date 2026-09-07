package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface EnrollmentMapper {

    Enrollment toEntity(EnrollmentRequest request);

    EnrollmentResponse toResponse(Enrollment enrollment);

    void updateEntityFromRequest(EnrollmentRequest request, @MappingTarget Enrollment enrollment);
}
