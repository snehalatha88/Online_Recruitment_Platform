package com.recruitment.dto.request;

import com.recruitment.entity.enums.DifficultyLevel;
import com.recruitment.entity.enums.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class QuestionCreateRequest {

    @NotBlank(message = "Question title is required")
    @Size(max = 200, message = "Title cannot exceed 200 characters")
    private String title;

    @NotBlank(message = "Question text is required")
    private String questionText;

    @NotNull(message = "Question type is required")
    private QuestionType questionType;

    @Builder.Default
    private DifficultyLevel difficulty = DifficultyLevel.MEDIUM;

    @NotBlank(message = "Category is required")
    @Size(max = 100, message = "Category cannot exceed 100 characters")
    private String category;

    @DecimalMin(value = "0.1", message = "Marks must be at least 0.1")
    @Builder.Default
    private double marks = 1.0;

    @Builder.Default
    private double negativeMarks = 0.0;

    private String explanation;

    @Builder.Default
    private List<QuestionOptionRequest> options = new ArrayList<>();

    private CodingDetailsRequest codingDetails;
}
