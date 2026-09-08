package com.artacademy.userservice.controller;

import com.artacademy.common.dto.ApiResponse;
import com.artacademy.userservice.dto.ParentRequest;
import com.artacademy.userservice.dto.ParentResponse;
import com.artacademy.userservice.service.ParentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/parents")
@RequiredArgsConstructor
@Tag(name = "Parents", description = "Parent management API")
public class ParentController {

    private final ParentService parentService;

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated parent's profile")
    public ResponseEntity<ApiResponse<ParentResponse>> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                parentService.getParentByLoginId(authentication.getName())));
    }

    @GetMapping("/me/children")
    @Operation(summary = "Get the children linked to the authenticated parent")
    public ResponseEntity<ApiResponse<List<ParentResponse>>> getMyChildren(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                parentService.getMyChildren(authentication.getName())));
    }

    @GetMapping
    @Operation(summary = "Get all parents (paginated)")
    public ResponseEntity<ApiResponse<Page<ParentResponse>>> getAllParents(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(parentService.getAllParents(pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get parent by ID")
    public ResponseEntity<ApiResponse<ParentResponse>> getParentById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(parentService.getParentById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new parent")
    public ResponseEntity<ApiResponse<ParentResponse>> createParent(
            @Valid @RequestBody ParentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(parentService.createParent(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing parent")
    public ResponseEntity<ApiResponse<ParentResponse>> updateParent(
            @PathVariable UUID id,
            @Valid @RequestBody ParentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(parentService.updateParent(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a parent")
    public ResponseEntity<ApiResponse<Void>> deleteParent(@PathVariable UUID id) {
        parentService.deleteParent(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
