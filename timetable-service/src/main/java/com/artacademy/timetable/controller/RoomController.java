package com.artacademy.timetable.controller;

import com.artacademy.timetable.dto.RoomRequest;
import com.artacademy.timetable.dto.RoomResponse;
import com.artacademy.timetable.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
@Tag(name = "Rooms", description = "Room management endpoints")
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    @Operation(summary = "Get all rooms")
    public ResponseEntity<List<RoomResponse>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get room by ID")
    public ResponseEntity<RoomResponse> getRoomById(@PathVariable UUID id) {
        return ResponseEntity.ok(roomService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Create a new room")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody RoomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.createRoom(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Update an existing room")
    public ResponseEntity<RoomResponse> updateRoom(@PathVariable UUID id,
                                                    @Valid @RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.updateRoom(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Delete a room")
    public ResponseEntity<Void> deleteRoom(@PathVariable UUID id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
