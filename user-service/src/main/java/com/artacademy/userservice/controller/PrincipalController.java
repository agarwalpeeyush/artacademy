package com.artacademy.userservice.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.userservice.dto.TeacherRequest;
import com.artacademy.userservice.dto.TeacherResponse;
import com.artacademy.userservice.service.TeacherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Principal provisioning (A.6 / D8). A Principal is a teacher Person carrying the elevated PRINCIPAL
// role; only the ADMIN may create one, so this lives on its own URL that SecurityConfig gates to ADMIN.
@RestController
@RequestMapping("/principals")
@RequiredArgsConstructor
@Tag(name = "Principals", description = "Principal provisioning (ADMIN authority)")
public class PrincipalController {

    private final TeacherService teacherService;

    @PostMapping
    @Operation(summary = "Create a new principal (teacher + elevated PRINCIPAL role)")
    public ResponseEntity<ApiResponse<TeacherResponse>> createPrincipal(
            @Valid @RequestBody TeacherRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(teacherService.createPrincipal(request)));
    }
}
