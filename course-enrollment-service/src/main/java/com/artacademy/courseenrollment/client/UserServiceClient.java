package com.artacademy.courseenrollment.client;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * First cross-service HTTP client in course-enrollment-service. Fetches display names from
 * user-service so enrollment/timetable responses can carry studentName / teacherName instead of
 * bare UUIDs. Uses the bulk paginated endpoints (one call each, not per-row) and forwards the
 * caller's JWT so the secured user-service endpoints accept the request.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserServiceClient {

    private static final String USER_SERVICE_BASE = "http://user-service";
    private static final int PAGE_SIZE = 1000;

    private final WebClient.Builder loadBalancedWebClientBuilder;

    public Map<UUID, String> fetchStudentNames() {
        return fetchNames("/students");
    }

    public Map<UUID, String> fetchTeacherNames() {
        return fetchNames("/teachers");
    }

    private Map<UUID, String> fetchNames(String path) {
        Map<UUID, String> names = new HashMap<>();
        String token = currentBearerToken();
        if (token == null) {
            log.warn("No bearer token on the current request; skipping {} name lookup", path);
            return names;
        }
        try {
            JsonNode root = loadBalancedWebClientBuilder.build()
                    .get()
                    .uri(USER_SERVICE_BASE + path + "?page=0&size=" + PAGE_SIZE)
                    .header(HttpHeaders.AUTHORIZATION, token)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            JsonNode content = root == null ? null : root.path("data").path("content");
            if (content != null && content.isArray()) {
                for (JsonNode node : content) {
                    String id = node.path("id").asText(null);
                    if (id == null) {
                        continue;
                    }
                    String first = node.path("firstName").asText("");
                    String last = node.path("lastName").asText("");
                    String full = (first + " " + last).trim();
                    if (!full.isEmpty()) {
                        names.put(UUID.fromString(id), full);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch names from user-service {}: {}", path, e.getMessage());
        }
        return names;
    }

    private String currentBearerToken() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            return servletAttrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
        }
        return null;
    }
}
