package com.artacademy.scheduling.controller;

import com.artacademy.scheduling.dto.GenerateScheduleRequest;
import com.artacademy.scheduling.dto.ScheduleConflictResponse;
import com.artacademy.scheduling.dto.ScheduleRequest;
import com.artacademy.scheduling.dto.ScheduleResponse;
import com.artacademy.scheduling.dto.ScheduleVersionResponse;
import com.artacademy.scheduling.dto.UpcomingClassResponse;
import com.artacademy.scheduling.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedules", description = "Schedule management endpoints")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    @Operation(summary = "Get all schedules")
    public ResponseEntity<List<ScheduleResponse>> getAllSchedules() {
        return ResponseEntity.ok(scheduleService.getAllSchedules());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get schedule by ID")
    public ResponseEntity<ScheduleResponse> getScheduleById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(scheduleService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Create a new schedule")
    public ResponseEntity<ScheduleResponse> createSchedule(@Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.createSchedule(request));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Auto-generate schedules for a list of class/teacher pairs")
    public ResponseEntity<List<ScheduleResponse>> generateSchedules(
            @Valid @RequestBody GenerateScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.generateSchedules(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Update an existing schedule")
    public ResponseEntity<ScheduleResponse> updateSchedule(@PathVariable("id") UUID id,
                                                            @Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.updateSchedule(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Delete a schedule")
    public ResponseEntity<Void> deleteSchedule(@PathVariable("id") UUID id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/publish")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Publish all draft schedules and snapshot the timetable")
    public ResponseEntity<ScheduleVersionResponse> publishAll() {
        return ResponseEntity.ok(scheduleService.publishAll());
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Publish a single schedule")
    public ResponseEntity<ScheduleResponse> publish(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(scheduleService.publish(id));
    }

    @PostMapping("/{id}/unpublish")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Unpublish a single schedule (back to draft)")
    public ResponseEntity<ScheduleResponse> unpublish(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(scheduleService.unpublish(id));
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "List published schedule versions")
    public ResponseEntity<List<ScheduleVersionResponse>> getHistory() {
        return ResponseEntity.ok(scheduleService.getHistory());
    }

    @GetMapping("/history/{versionId}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Get a published schedule version with its entries")
    public ResponseEntity<ScheduleVersionResponse> getHistoryVersion(@PathVariable("versionId") UUID versionId) {
        return ResponseEntity.ok(scheduleService.getHistoryVersion(versionId));
    }

    @GetMapping("/conflicts")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "List scheduling conflicts (teacher/room double-booking, class overlaps)")
    public ResponseEntity<List<ScheduleConflictResponse>> getConflicts() {
        return ResponseEntity.ok(scheduleService.getConflicts());
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming class sessions in chronological order")
    public ResponseEntity<List<UpcomingClassResponse>> getUpcoming(
            @RequestParam(name = "classIds", required = false) String classIdsParam,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        List<UUID> classIds = parseClassIds(classIdsParam);
        return ResponseEntity.ok(scheduleService.getUpcoming(classIds, limit));
    }

    @GetMapping("/teacher/{teacherId}")
    @Operation(summary = "Get schedules for a teacher")
    public ResponseEntity<List<ScheduleResponse>> getByTeacher(@PathVariable("teacherId") UUID teacherId) {
        return ResponseEntity.ok(scheduleService.getByTeacher(teacherId));
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Get schedules for a student by their enrolled class IDs")
    public ResponseEntity<List<ScheduleResponse>> getByStudent(
            @PathVariable("studentId") UUID studentId,
            @RequestParam(name = "classIds", required = false) String classIdsParam) {
        List<UUID> classIds = parseClassIds(classIdsParam);
        if (classIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(scheduleService.getByStudent(studentId, classIds));
    }

    private static List<UUID> parseClassIds(String classIdsParam) {
        if (classIdsParam == null || classIdsParam.isBlank()) {
            return List.of();
        }
        return Arrays.stream(classIdsParam.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(UUID::fromString)
                .toList();
    }
}
