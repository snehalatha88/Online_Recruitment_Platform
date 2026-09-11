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
public class QuestionOptionRequest {

    private Long id;

    private String optionText;

    @com.fasterxml.jackson.annotation.JsonProperty("isCorrect")
    @com.fasterxml.jackson.annotation.JsonAlias({"isCorrect", "correct"})
    private boolean isCorrect;

    private int optionOrder;
}
