package com.recruitment.controller;

import com.recruitment.dto.request.ExamAssignRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.entity.ExamAssignment;
import com.recruitment.entity.enums.AssignmentStatus;
import com.recruitment.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/assignments")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminAssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> assignExam(@Valid @RequestBody ExamAssignRequest request) {
        int count = assignmentService.assignExam(request);
        Map<String, Object> result = new HashMap<>();
        result.put("assignedCount", count);
        return ResponseEntity.ok(ApiResponse.success("Successfully assigned exam to " + count + " candidate(s)", result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<com.recruitment.dto.response.ExamAssignmentResponse>>> getAssignments(
            @RequestParam(required = false) Long examId,
            @RequestParam(required = false) Long candidateId,
            @RequestParam(required = false) AssignmentStatus status,
            @PageableDefault(size = 10, sort = "assignedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<com.recruitment.dto.response.ExamAssignmentResponse> assignments = assignmentService.searchAssignments(examId, candidateId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(assignments));
    }

    @PostMapping("/{id}/reassign")
    public ResponseEntity<ApiResponse<com.recruitment.dto.response.ExamAssignmentResponse>> reassignExam(
            @PathVariable Long id,
            @RequestBody(required = false) ExamAssignRequest request) {
        com.recruitment.dto.response.ExamAssignmentResponse response = assignmentService.reassignExam(id, request != null ? request.getDueDate() : null);
        return ResponseEntity.ok(ApiResponse.success("Successfully reassigned exam to candidate", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAssignment(@PathVariable Long id) {
        assignmentService.deleteAssignment(id);
        return ResponseEntity.ok(ApiResponse.success("Assignment removed successfully", null));
    }
}
