package com.artacademy.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherResponse {

    private UUID id;
    private String loginId;
    private String firstName;
    private String lastName;
    private String employeeCode;
    private String email;
    private String phone;
    private String qualification;
    private LocalDate joiningDate;
    private String status;
}
