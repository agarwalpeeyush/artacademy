package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.Enrollment;
import com.artacademy.courseenrollment.domain.EnrollmentFee;
import com.artacademy.courseenrollment.domain.FeeType;
import com.artacademy.courseenrollment.dto.EnrollmentFeeDto;
import com.artacademy.courseenrollment.dto.EnrollmentRequest;
import com.artacademy.courseenrollment.dto.EnrollmentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring", uses = TimetableMapper.class)
public interface EnrollmentMapper {

    @Mapping(target = "fees", ignore = true)
    @Mapping(target = "timetables", ignore = true)
    Enrollment toEntity(EnrollmentRequest request);

    @Mapping(target = "courseName", source = "course.courseName")
    EnrollmentResponse toResponse(Enrollment enrollment);

    @Mapping(target = "feeType", source = "feeType", qualifiedByName = "feeTypeCode")
    EnrollmentFeeDto toFeeDto(EnrollmentFee fee);

    @Named("feeTypeCode")
    static String feeTypeCode(FeeType feeType) {
        return feeType != null ? feeType.getCode() : null;
    }
}
