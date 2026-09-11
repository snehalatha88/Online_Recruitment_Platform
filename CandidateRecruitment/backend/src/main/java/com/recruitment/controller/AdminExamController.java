package com.recruitment.controller;

import com.recruitment.dto.request.ExamCreateRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.ExamResponse;
import com.recruitment.entity.enums.ExamStatus;
import com.recruitment.service.ExamService;
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

import java.util.Map;

@RestController
@RequestMapping("/api/admin/exams")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminExamController {

    private final ExamService examService;

    @PostMapping
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(@Valid @RequestBody ExamCreateRequest request) {
        ExamResponse response = examService.createExam(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Exam created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ExamResponse>>> getExams(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) ExamStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ExamResponse> exams = examService.searchExams(query, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(exams));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> getExamById(@PathVariable Long id) {
        ExamResponse response = examService.getExamById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> updateExam(
            @PathVariable Long id,
            @Valid @RequestBody ExamCreateRequest request) {
        ExamResponse response = examService.updateExam(id, request);
        return ResponseEntity.ok(ApiResponse.success("Exam updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<String>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        ExamStatus status = ExamStatus.valueOf(body.get("status").toUpperCase());
        examService.updateExamStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Exam status changed to " + status, null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExam(@PathVariable Long id) {
        examService.deleteExam(id);
        return ResponseEntity.ok(ApiResponse.success("Exam deleted successfully", null));
    }
}
