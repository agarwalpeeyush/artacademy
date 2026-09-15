package com.artacademy.courseenrollment.mapper;

import com.artacademy.courseenrollment.domain.Course;
import com.artacademy.courseenrollment.dto.CourseResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CourseMapper {

    public CourseResponse toResponse(Course course) {
        List<CourseResponse.FeeItem> fees = course.getFees() == null ? List.of()
                : course.getFees().stream()
                        .map(f -> CourseResponse.FeeItem.builder()
                                .id(f.getId())
                                .feeType(f.getFeeType())
                                .amount(f.getAmount())
                                .cadence(f.getCadence())
                                .instituteShareType(f.getInstituteShareType())
                                .instituteShareValue(f.getInstituteShareValue())
                                .build())
                        .toList();

        return CourseResponse.builder()
                .id(course.getId())
                .courseCode(course.getCourseCode())
                .courseName(course.getCourseName())
                .courseTypeCode(course.getCourseType() != null ? course.getCourseType().getCode() : null)
                .courseTypeName(course.getCourseType() != null ? course.getCourseType().getName() : null)
                .description(course.getDescription())
                .durationMonths(course.getDurationMonths())
                .status(course.getStatus())
                .fees(fees)
                .build();
    }
}
