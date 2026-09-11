package com.recruitment.dto.response;

import com.recruitment.entity.enums.ExecutionStatus;
import com.recruitment.entity.enums.Language;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingSubmissionResponse {
    private Long id;
    private Long attemptId;
    private Long codingQuestionId;
    private Language language;
    private String sourceCode;
    private ExecutionStatus executionStatus;
    private int testCasesPassed;
    private int totalTestCases;
    private double scoreAwarded;
    private long executionTimeMs;
    private long memoryUsedKb;
    private String compilerOutput;
    private Instant submittedAt;
}
