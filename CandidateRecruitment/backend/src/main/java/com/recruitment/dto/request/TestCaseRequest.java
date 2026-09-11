package com.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCaseRequest {

    private Long id;

    private String inputData;

    @NotBlank(message = "Expected output is required")
    private String expectedOutput;

    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonProperty("isHidden")
    @com.fasterxml.jackson.annotation.JsonAlias({"isHidden", "hidden"})
    private boolean isHidden = false;

    @Builder.Default
    private double marksWeight = 1.0;

    private int orderIndex;
}
