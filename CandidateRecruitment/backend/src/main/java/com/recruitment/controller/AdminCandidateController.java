package com.recruitment.controller;

import com.recruitment.dto.request.CandidateCreateRequest;
import com.recruitment.dto.request.CandidateUpdateRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.CandidateFullDetailResponse;
import com.recruitment.dto.response.CandidateResponse;
import com.recruitment.entity.enums.UserStatus;
import com.recruitment.service.CandidateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/candidates")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminCandidateController {

    private final CandidateService candidateService;

    @PostMapping
    public ResponseEntity<ApiResponse<CandidateResponse>> createCandidate(@Valid @RequestBody CandidateCreateRequest request) {
        CandidateResponse response = candidateService.createCandidate(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Candidate registered successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CandidateResponse>>> getCandidates(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CandidateResponse> candidates = candidateService.searchCandidates(query, department, pageable);
        return ResponseEntity.ok(ApiResponse.success(candidates));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CandidateResponse>> getCandidateById(@PathVariable Long id) {
        CandidateResponse response = candidateService.getCandidateById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/exam-details")
    public ResponseEntity<ApiResponse<CandidateFullDetailResponse>> getCandidateExamDetails(@PathVariable Long id) {
        CandidateFullDetailResponse response = candidateService.getCandidateFullDetails(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CandidateResponse>> updateCandidate(
            @PathVariable Long id,
            @Valid @RequestBody CandidateUpdateRequest request) {
        CandidateResponse response = candidateService.updateCandidate(id, request);
        return ResponseEntity.ok(ApiResponse.success("Candidate updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<String>> toggleStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        UserStatus status = UserStatus.valueOf(body.get("status").toUpperCase());
        candidateService.toggleCandidateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Candidate status updated to " + status, null));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        candidateService.resetPassword(id, newPassword);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCandidate(@PathVariable Long id) {
        candidateService.deleteCandidate(id);
        return ResponseEntity.ok(ApiResponse.success("Candidate deleted successfully", null));
    }

    @GetMapping("/departments")
    public ResponseEntity<ApiResponse<List<String>>> getDepartments() {
        List<String> departments = candidateService.getAllDepartments();
        return ResponseEntity.ok(ApiResponse.success(departments));
    }
}
