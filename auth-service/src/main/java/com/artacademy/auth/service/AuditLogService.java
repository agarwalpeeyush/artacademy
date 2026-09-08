package com.artacademy.auth.service;

import com.artacademy.auth.domain.AuditLog;
import com.artacademy.auth.dto.AuditLogResponse;
import com.artacademy.auth.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(String username, String action, String detail, String ipAddress, boolean success) {
        AuditLog entry = AuditLog.builder()
                .username(username)
                .action(action)
                .detail(detail)
                .ipAddress(ipAddress)
                .success(success)
                .build();
        auditLogRepository.save(entry);
    }

    public Page<AuditLogResponse> findAll(Pageable pageable) {
        return auditLogRepository.findAllByOrderByOccurredAtDesc(pageable)
                .map(this::toResponse);
    }

    public Page<AuditLogResponse> findByUsername(String username, Pageable pageable) {
        return auditLogRepository.findByUsernameOrderByOccurredAtDesc(username, pageable)
                .map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .username(log.getUsername())
                .action(log.getAction())
                .detail(log.getDetail())
                .ipAddress(log.getIpAddress())
                .success(log.isSuccess())
                .occurredAt(log.getOccurredAt())
                .build();
    }
}
