package com.artacademy.courseenrollment.user.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.courseenrollment.user.dto.PersonLookupResponse;
import com.artacademy.courseenrollment.user.service.PersonLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/persons")
@RequiredArgsConstructor
@Tag(name = "Persons", description = "Cross-role identity lookup for the confirm-and-link flow (OQ1)")
public class PersonController {

    private final PersonLookupService personLookupService;

    @GetMapping("/lookup")
    @Operation(summary = "Look up existing Persons by phone (returns candidates to confirm-and-link)")
    public ResponseEntity<ApiResponse<List<PersonLookupResponse>>> lookupByPhone(
            @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(personLookupService.lookupByPhone(phone)));
    }
}
