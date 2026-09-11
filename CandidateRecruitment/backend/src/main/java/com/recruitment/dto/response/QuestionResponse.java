package com.recruitment.dto.response;

import com.recruitment.entity.enums.DifficultyLevel;
import com.recruitment.entity.enums.QuestionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {
    private Long id;
    private String title;
    private String questionText;
    private QuestionType questionType;
    private DifficultyLevel difficulty;
    private String category;
    private double marks;
    private double negativeMarks;
    private String explanation;
    @Builder.Default
    private List<QuestionOptionResponse> options = new ArrayList<>();
    private CodingDetailsResponse codingDetails;
    private Instant createdAt;
}
