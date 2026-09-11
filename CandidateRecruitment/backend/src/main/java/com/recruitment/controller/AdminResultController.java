package com.recruitment.controller;

import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.AttemptDetailResponse;
import com.recruitment.dto.response.ExamResultResponse;
import com.recruitment.service.ResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/results")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminResultController {

    private final ResultService resultService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ExamResultResponse>>> getResults(
            @RequestParam(required = false) Long examId,
            @RequestParam(required = false) Long candidateId,
            @RequestParam(required = false) Boolean isPassed,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 10, sort = "evaluatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ExamResultResponse> results = resultService.searchResults(examId, candidateId, isPassed, query, pageable);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/{attemptId}")
    public ResponseEntity<ApiResponse<AttemptDetailResponse>> getAttemptDetail(@PathVariable Long attemptId) {
        AttemptDetailResponse detail = resultService.getAttemptDetail(attemptId);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }
}
