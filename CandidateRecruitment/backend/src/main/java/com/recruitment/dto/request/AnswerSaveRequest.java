package com.recruitment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerSaveRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    private String selectedOptionIds;

    private boolean isMarkedForReview;
}
