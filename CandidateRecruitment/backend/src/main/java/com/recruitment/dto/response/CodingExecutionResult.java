package com.recruitment.dto.response;

import com.recruitment.entity.enums.ExecutionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingExecutionResult {
    private ExecutionStatus executionStatus;
    private boolean passed;
    private String stdout;
    private String stderr;
    private String compileErrors;
    private long executionTimeMs;
    private long memoryUsedKb;
    private int testCasesPassed;
    private int totalTestCases;
    private double scoreAwarded;
    @Builder.Default
    private List<TestCaseResultItem> testCaseResults = new ArrayList<>();
}
