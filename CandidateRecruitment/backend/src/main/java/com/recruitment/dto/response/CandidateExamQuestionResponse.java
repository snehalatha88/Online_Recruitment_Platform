package com.recruitment.dto.response;

import com.recruitment.entity.enums.DifficultyLevel;
import com.recruitment.entity.enums.QuestionType;
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
public class CandidateExamQuestionResponse {
    private Long questionId;
    private int questionOrder;
    private String title;
    private String questionText;
    private QuestionType questionType;
    private DifficultyLevel difficulty;
    private String category;
    private double marks;
    private double negativeMarks;
    @Builder.Default
    private List<CandidateQuestionOptionResponse> options = new ArrayList<>();
    private CandidateCodingDetailsResponse codingDetails;
    private String currentAnswer; // Selected option ID(s)
    private boolean isMarkedForReview;
    private String currentCode;
    private String currentLanguage;
}
