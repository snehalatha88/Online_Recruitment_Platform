package com.recruitment.dto.response;

import com.recruitment.entity.enums.ExamStatus;
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
public class ExamResponse {
    private Long id;
    private String title;
    private String description;
    private String instructions;
    private int durationMinutes;
    private double passingPercentage;
    private int maxAttempts;
    private Instant startDateTime;
    private Instant endDateTime;
    private ExamStatus status;
    private boolean negativeMarkingEnabled;
    private double negativeMarksPerWrong;
    private boolean randomizeQuestions;
    private boolean proctoringEnabled;
    private boolean fullScreenRequired;
    private int maxViolations;
    private boolean autoSubmitOnViolation;
    private int questionCount;
    private double totalMarks;
    private String createdByUsername;
    private Instant createdAt;
    @Builder.Default
    private List<QuestionResponse> questions = new ArrayList<>();
}
