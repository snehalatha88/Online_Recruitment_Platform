package com.recruitment.controller;

import com.recruitment.dto.request.ViolationReportRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.ProctoringViolationResponse;
import com.recruitment.service.ProctoringService;
import com.recruitment.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/candidate")
@PreAuthorize("hasAuthority('ROLE_CANDIDATE')")
@RequiredArgsConstructor
public class CandidateProctoringController {

    private final ProctoringService proctoringService;
    private final com.recruitment.service.ProctoringAiService proctoringAiService;

    @PostMapping("/attempts/{attemptId}/violations")
    public ResponseEntity<ApiResponse<ProctoringViolationResponse>> reportViolation(
            @PathVariable Long attemptId,
            @Valid @RequestBody ViolationReportRequest request) {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        ProctoringViolationResponse response = proctoringService.recordViolation(attemptId, request, candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success("Violation recorded", response));
    }

    @GetMapping("/proctoring/ai-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAiStatus() {
        Map<String, Object> status = proctoringAiService.getAiHealthStatus();
        return ResponseEntity.ok(ApiResponse.success("AI Proctoring status", status));
    }
}

