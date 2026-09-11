package com.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Public test cases only for Candidate coding editor
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateTestCaseResponse {
    private Long id;
    private String inputData;
    private String expectedOutput;
    private int orderIndex;
}
