package com.recruitment.dto.response;

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
public class CandidateCodingDetailsResponse {
    private Long id;
    private String problemStatement;
    private String inputFormat;
    private String outputFormat;
    private String constraints;
    private String sampleInput;
    private String sampleOutput;
    private String allowedLanguages;
    private int timeLimitMs;
    private int memoryLimitMb;
    private String starterCodeTemplates;
    @Builder.Default
    private List<CandidateTestCaseResponse> sampleTestCases = new ArrayList<>();
}
