package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.domain.EnrollmentFee;
import com.artacademy.courseenrollment.dto.EnrollmentFeeDto;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", uses = TimetableMapper.class)
public interface EnrollmentMapper {

    @Mapping(target = "fees", ignore = true)
    @Mapping(target = "timetables", ignore = true)
    Enrollment toEntity(EnrollmentRequest request);

    @Mapping(target = "courseName", source = "course.courseName")
    EnrollmentResponse toResponse(Enrollment enrollment);

    EnrollmentFeeDto toFeeDto(EnrollmentFee fee);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "enrollment", ignore = true)
    EnrollmentFee toFeeEntity(EnrollmentFeeDto dto);

    void updateEntityFromRequest(EnrollmentRequest request, @MappingTarget Enrollment enrollment);
}
