package com.recruitment.controller;

import com.recruitment.dto.request.CodingRunRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.CodingExecutionResult;
import com.recruitment.entity.CodingQuestion;
import com.recruitment.entity.TestCase;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.CodingQuestionRepository;
import com.recruitment.repository.TestCaseRepository;
import com.recruitment.service.CodeExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/candidate/coding")
@PreAuthorize("hasAuthority('ROLE_CANDIDATE')")
@RequiredArgsConstructor
public class CandidateCodingController {

    private final CodeExecutionService codeExecutionService;
    private final CodingQuestionRepository codingQuestionRepository;
    private final TestCaseRepository testCaseRepository;

    @PostMapping("/run")
    public ResponseEntity<ApiResponse<CodingExecutionResult>> runCode(@Valid @RequestBody CodingRunRequest request) {
        CodingQuestion cq = codingQuestionRepository.findById(request.getCodingQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Coding question not found"));

        List<TestCase> testCasesToRun;

        if (StringUtils.hasText(request.getCustomInput())) {
            // Run against custom user input
            TestCase customTc = TestCase.builder()
                    .inputData(request.getCustomInput())
                    .expectedOutput("")
                    .isHidden(false)
                    .orderIndex(1)
                    .build();
            testCasesToRun = Collections.singletonList(customTc);
        } else {
            // Run against public sample test cases ONLY
            testCasesToRun = testCaseRepository.findByCodingQuestionIdAndIsHiddenFalseOrderByOrderIndexAsc(cq.getId());
        }

        CodingExecutionResult result = codeExecutionService.execute(
                request.getLanguage(),
                request.getSourceCode(),
                testCasesToRun,
                cq.getTimeLimitMs()
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
