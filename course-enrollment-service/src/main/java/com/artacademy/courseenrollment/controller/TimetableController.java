package com.artacademy.courseenrollment.controller;

import com.artacademy.courseenrollment.dto.GenerateTimetableRequest;
import com.artacademy.courseenrollment.dto.TimetableConflictResponse;
import com.artacademy.courseenrollment.dto.TimetableRequest;
import com.artacademy.courseenrollment.dto.TimetableResponse;
import com.artacademy.courseenrollment.dto.UpcomingClassResponse;
import com.artacademy.courseenrollment.service.TimetableService;
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
@RequestMapping("/timetables")
@RequiredArgsConstructor
@Tag(name = "Timetables", description = "Timetable management endpoints")
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping
    @Operation(summary = "Get all timetables")
    public ResponseEntity<List<TimetableResponse>> getAllTimetables() {
        return ResponseEntity.ok(timetableService.getAllTimetables());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get timetable by ID")
    public ResponseEntity<TimetableResponse> getTimetableById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(timetableService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Create a new timetable")
    public ResponseEntity<TimetableResponse> createTimetable(@Valid @RequestBody TimetableRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetableService.createTimetable(request));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Auto-generate timetables for a list of class/teacher pairs")
    public ResponseEntity<List<TimetableResponse>> generateTimetables(
            @Valid @RequestBody GenerateTimetableRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetableService.generateTimetables(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Update an existing timetable")
    public ResponseEntity<TimetableResponse> updateTimetable(@PathVariable("id") UUID id,
                                                            @Valid @RequestBody TimetableRequest request) {
        return ResponseEntity.ok(timetableService.updateTimetable(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "Delete a timetable")
    public ResponseEntity<Void> deleteTimetable(@PathVariable("id") UUID id) {
        timetableService.deleteTimetable(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/conflicts")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @Operation(summary = "List timetable conflicts (teacher double-booking, class overlaps)")
    public ResponseEntity<List<TimetableConflictResponse>> getConflicts() {
        return ResponseEntity.ok(timetableService.getConflicts());
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming class sessions in chronological order")
    public ResponseEntity<List<UpcomingClassResponse>> getUpcoming(
            @RequestParam(name = "classIds", required = false) String classIdsParam,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        List<UUID> classIds = parseClassIds(classIdsParam);
        return ResponseEntity.ok(timetableService.getUpcoming(classIds, limit));
    }

    @GetMapping("/teacher/{teacherId}")
    @Operation(summary = "Get timetables for a teacher")
    public ResponseEntity<List<TimetableResponse>> getByTeacher(@PathVariable("teacherId") UUID teacherId) {
        return ResponseEntity.ok(timetableService.getByTeacher(teacherId));
    }

    @GetMapping("/class/{classId}")
    @Operation(summary = "Get timetables for a class")
    public ResponseEntity<List<TimetableResponse>> getByClass(@PathVariable("classId") UUID classId) {
        return ResponseEntity.ok(timetableService.getByClass(classId));
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Get timetables for a student by their enrolled class IDs")
    public ResponseEntity<List<TimetableResponse>> getByStudent(
            @PathVariable("studentId") UUID studentId,
            @RequestParam(name = "classIds", required = false) String classIdsParam) {
        List<UUID> classIds = parseClassIds(classIdsParam);
        if (classIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(timetableService.getByStudent(studentId, classIds));
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
