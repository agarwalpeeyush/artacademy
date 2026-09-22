package com.artacademy.courseenrollment.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Lightweight reference to a student, used when listing a parent's children. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChildRef {
    private UUID id;
    private String name;
}
