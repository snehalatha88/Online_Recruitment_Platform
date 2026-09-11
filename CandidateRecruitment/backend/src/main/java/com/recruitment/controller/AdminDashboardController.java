package com.recruitment.controller;

import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.AuditLogResponse;
import com.recruitment.dto.response.DashboardStatsResponse;
import com.recruitment.service.AuditLogService;
import com.recruitment.service.ResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final ResultService resultService;
    private final AuditLogService auditLogService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboardStats() {
        DashboardStatsResponse stats = resultService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endTime,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 15, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AuditLogResponse> logs = auditLogService.searchAuditLogs(userId, action, startTime, endTime, query, pageable);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/audit-actions")
    public ResponseEntity<ApiResponse<List<String>>> getAuditActions() {
        List<String> actions = auditLogService.getAllDistinctActions();
        return ResponseEntity.ok(ApiResponse.success(actions));
    }
}
