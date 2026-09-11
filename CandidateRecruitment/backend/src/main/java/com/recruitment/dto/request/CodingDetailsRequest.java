package com.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
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
public class CodingDetailsRequest {

    private String problemStatement;

    private String inputFormat;

    private String outputFormat;

    private String constraints;

    private String sampleInput;

    private String sampleOutput;

    @Builder.Default
    private String allowedLanguages = "JAVA,PYTHON,CPP,C,JAVASCRIPT";

    @Builder.Default
    private int timeLimitMs = 2000;

    @Builder.Default
    private int memoryLimitMb = 256;

    private String starterCodeTemplates;

    @Builder.Default
    private List<TestCaseRequest> testCases = new ArrayList<>();
}
