package com.artacademy.attendance.dto;

import com.artacademy.attendance.domain.AttendanceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Direct bulk-edit of attendance records (R16). No approve/reject step: the editor applies new
 * statuses immediately and one audit-log row is appended per changed record. Used by teachers
 * (student attendance) and principals (student or teacher attendance).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceEditRequest {

    @NotNull(message = "Editor user id is required")
    private UUID editedByUserId;

    /** Role of the editor: TEACHER or PRINCIPAL. */
    @NotNull(message = "Editor role is required")
    private String editorRole;

    private String reason;

    @NotEmpty(message = "At least one edit is required")
    @Valid
    private List<Edit> edits;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Edit {
        @NotNull(message = "Attendance record id is required")
        private UUID attendanceId;

        @NotNull(message = "New status is required")
        private AttendanceStatus newStatus;
    }
}
