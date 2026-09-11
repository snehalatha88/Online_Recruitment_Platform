package com.recruitment.service;

import com.recruitment.dto.response.AuditLogResponse;
import com.recruitment.entity.AuditLog;
import com.recruitment.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void logAction(Long userId, String username, String action, String ipAddress, String userAgent, String details) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .username(username)
                    .action(action)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .details(details)
                    .timestamp(Instant.now())
                    .build();

            auditLogRepository.save(auditLog);
            log.info("AUDIT: User [{}] ({}) performed [{}] - {}", username, userId, action, details);
        } catch (Exception e) {
            log.error("Failed to write audit log for action: {}", action, e);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchAuditLogs(Long userId, String action, Instant startTime, Instant endTime, String query, Pageable pageable) {
        return auditLogRepository.searchAuditLogs(userId, action, startTime, endTime, query, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<String> getAllDistinctActions() {
        return auditLogRepository.findAllDistinctActions();
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .username(log.getUsername())
                .action(log.getAction())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .details(log.getDetails())
                .timestamp(log.getTimestamp())
                .build();
    }
}
