package com.artacademy.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Lightweight reference to a parent, used when listing a student's parents. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentRef {
    private UUID id;
    private String name;
    private String relationship;
    private String phone;
}
