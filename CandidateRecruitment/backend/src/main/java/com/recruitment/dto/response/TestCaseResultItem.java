package com.recruitment.dto.response;

import com.recruitment.entity.enums.ExecutionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCaseResultItem {
    private int testCaseIndex;
    private boolean isHidden;
    private boolean passed;
    private String input;
    private String expectedOutput;
    private String actualOutput;
    private String errorMessage;
    private long executionTimeMs;
    private ExecutionStatus status;
}
