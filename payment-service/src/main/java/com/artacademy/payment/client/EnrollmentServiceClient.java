package com.artacademy.payment.client;

import com.artacademy.common.security.JwtUtil;
import com.artacademy.payment.dto.ScopedStudent;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Reads enrollment data from course-enrollment-service at Generate-Bill time. Because the
 * Generate / Kafka threads carry no inbound JWT, this client mints a short-lived <em>system</em>
 * token (role PRINCIPAL) to satisfy the {@code /enrollments/**} {@code .authenticated()} rule.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EnrollmentServiceClient {

    private static final String ENROLLMENT_SERVICE_BASE = "http://course-enrollment-service";

    private final WebClient.Builder loadBalancedWebClientBuilder;
    private final JwtUtil jwtUtil;

    /** Enrollment date for back-fill; null (logged) if the lookup fails. */
    public LocalDate fetchEnrollmentDate(UUID enrollmentId) {
        try {
            JsonNode root = loadBalancedWebClientBuilder.build()
                    .get()
                    .uri(ENROLLMENT_SERVICE_BASE + "/enrollments/" + enrollmentId)
                    .header(HttpHeaders.AUTHORIZATION, systemToken())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            String date = root == null ? null : root.path("data").path("enrollmentDate").asText(null);
            return date != null && !date.isBlank() ? LocalDate.parse(date) : null;
        } catch (Exception e) {
            log.warn("Failed to fetch enrollment date for enrollmentId={}: {}", enrollmentId, e.getMessage());
            return null;
        }
    }

    /** Enrollment ids for a course cohort (used to batch-bill EXAM fees). */
    public List<UUID> fetchEnrollmentIdsForCourse(UUID courseId) {
        return fetchEnrollmentIds("/enrollments/course/" + courseId);
    }

    /**
     * Name-resolved students for the fee picker. When {@code teacherId} is non-null the list is
     * scoped to that teacher's enrollments; otherwise every enrollment is returned.
     */
    public List<ScopedStudent> fetchScopedStudents(UUID teacherId) {
        String path = teacherId != null
                ? "/enrollments/teacher/" + teacherId
                : "/enrollments";
        List<ScopedStudent> students = new ArrayList<>();
        try {
            JsonNode root = loadBalancedWebClientBuilder.build()
                    .get()
                    .uri(ENROLLMENT_SERVICE_BASE + path)
                    .header(HttpHeaders.AUTHORIZATION, systemToken())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            JsonNode data = root == null ? null : root.path("data");
            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    students.add(ScopedStudent.builder()
                            .studentId(uuid(node, "studentId"))
                            .enrollmentId(uuid(node, "id"))
                            .courseId(uuid(node, "courseId"))
                            .teacherId(uuid(node, "teacherId"))
                            .studentName(node.path("studentName").asText(null))
                            .courseName(node.path("courseName").asText(null))
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch scoped students from {}: {}", path, e.getMessage());
        }
        return students;
    }

    private static UUID uuid(JsonNode node, String field) {
        String value = node.path(field).asText(null);
        return value != null && !value.isBlank() ? UUID.fromString(value) : null;
    }

    private List<UUID> fetchEnrollmentIds(String path) {
        List<UUID> ids = new ArrayList<>();
        try {
            JsonNode root = loadBalancedWebClientBuilder.build()
                    .get()
                    .uri(ENROLLMENT_SERVICE_BASE + path)
                    .header(HttpHeaders.AUTHORIZATION, systemToken())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            JsonNode data = root == null ? null : root.path("data");
            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    String id = node.path("id").asText(null);
                    if (id != null && !id.isBlank()) {
                        ids.add(UUID.fromString(id));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch enrollment ids from {}: {}", path, e.getMessage());
        }
        return ids;
    }

    private String systemToken() {
        return "Bearer " + jwtUtil.generateToken("payment-service", List.of("PRINCIPAL"));
    }
}
