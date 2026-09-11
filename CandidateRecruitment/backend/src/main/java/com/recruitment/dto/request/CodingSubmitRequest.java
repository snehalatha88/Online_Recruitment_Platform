package com.recruitment.dto.request;

import com.recruitment.entity.enums.Language;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingSubmitRequest {

    @NotNull(message = "Coding question ID is required")
    private Long codingQuestionId;

    @NotNull(message = "Language is required")
    private Language language;

    @NotBlank(message = "Source code is required")
    private String sourceCode;
}
