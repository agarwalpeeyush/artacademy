package com.artacademy.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentResponse {

    private UUID id;
    private String loginId;
    private String firstName;
    private String lastName;
    private String relationship;
    private String phone;
    private String email;
    private String address;
    private String occupation;
    private UUID studentId;
    private String studentName;
    private String status;
}
