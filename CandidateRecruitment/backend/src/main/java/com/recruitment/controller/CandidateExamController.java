package com.recruitment.controller;

import com.recruitment.dto.request.AnswerSaveRequest;
import com.recruitment.dto.request.CodingSubmitRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.AttemptStartResponse;
import com.recruitment.dto.response.AttemptStatusResponse;
import com.recruitment.dto.response.CandidateExamCardResponse;
import com.recruitment.entity.enums.SubmissionReason;
import com.recruitment.service.ExamTakingService;
import com.recruitment.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate")
@PreAuthorize("hasAuthority('ROLE_CANDIDATE')")
@RequiredArgsConstructor
public class CandidateExamController {

    private final ExamTakingService examTakingService;

    @GetMapping("/exams")
    public ResponseEntity<ApiResponse<List<CandidateExamCardResponse>>> getAssignedExams() {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        List<CandidateExamCardResponse> exams = examTakingService.getAssignedExams(candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success(exams));
    }

    @PostMapping("/exams/{examId}/start")
    public ResponseEntity<ApiResponse<AttemptStartResponse>> startExam(@PathVariable Long examId) {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        AttemptStartResponse response = examTakingService.startExam(examId, candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success("Assessment started successfully", response));
    }

    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<ApiResponse<AttemptStartResponse>> getAttemptState(@PathVariable Long attemptId) {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        AttemptStartResponse response = examTakingService.getAttemptQuestions(attemptId, candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/attempts/{attemptId}/answers")
    public ResponseEntity<ApiResponse<String>> saveAnswer(
            @PathVariable Long attemptId,
            @Valid @RequestBody AnswerSaveRequest request) {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        examTakingService.saveAnswer(attemptId, request, candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success("Answer saved successfully", null));
    }

    @PostMapping("/attempts/{attemptId}/draft-code")
    public ResponseEntity<ApiResponse<String>> saveDraftCode(
            @PathVariable Long attemptId,
            @Valid @RequestBody CodingSubmitRequest request) {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        examTakingService.saveCodingDraft(attemptId, request, candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success("Draft saved successfully", null));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<ApiResponse<AttemptStatusResponse>> submitExam(
            @PathVariable Long attemptId,
            @RequestBody(required = false) Map<String, String> body) {
        Long candidateProfileId = SecurityUtils.getCurrentCandidateProfileId();
        SubmissionReason reason = SubmissionReason.MANUAL;
        if (body != null && body.containsKey("reason")) {
            try {
                reason = SubmissionReason.valueOf(body.get("reason").toUpperCase());
            } catch (Exception ignored) {}
        }

        AttemptStatusResponse response = examTakingService.submitExam(attemptId, reason, candidateProfileId);
        return ResponseEntity.ok(ApiResponse.success("Examination submitted successfully", response));
    }
}
