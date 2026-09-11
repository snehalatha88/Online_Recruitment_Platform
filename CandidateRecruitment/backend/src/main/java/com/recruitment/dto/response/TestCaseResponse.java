package com.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCaseResponse {
    private Long id;
    private String inputData;
    private String expectedOutput;
    private boolean isHidden;
    private double marksWeight;
    private int orderIndex;
}
