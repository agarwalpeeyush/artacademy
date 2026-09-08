package com.artacademy.scheduling.controller;

import com.artacademy.scheduling.dto.RoomAvailabilityResponse;
import com.artacademy.scheduling.dto.RoomRequest;
import com.artacademy.scheduling.dto.RoomResponse;
import com.artacademy.scheduling.service.RoomService;
import com.artacademy.scheduling.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
@Tag(name = "Rooms", description = "Room management endpoints")
public class RoomController {

    private final RoomService roomService;
    private final ScheduleService scheduleService;

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

    @GetMapping("/{roomId}/availability")
    @Operation(summary = "Get a room's occupied and free slots for the day of a given date")
    public ResponseEntity<RoomAvailabilityResponse> getAvailability(
            @PathVariable("roomId") UUID roomId,
            @RequestParam(name = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "day", required = false) DayOfWeek day) {
        DayOfWeek resolved = day != null ? day
                : (date != null ? date.getDayOfWeek() : LocalDate.now().getDayOfWeek());
        return ResponseEntity.ok(scheduleService.getRoomAvailability(roomId, resolved));
    }
}
