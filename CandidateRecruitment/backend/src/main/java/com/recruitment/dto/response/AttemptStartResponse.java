package com.recruitment.dto.response;

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
public class AttemptStartResponse {
    private Long attemptId;
    private Long examId;
    private String examTitle;
    private String instructions;
    private Instant startTime;
    private Instant expectedEndTime;
    private int durationMinutes;
    private long remainingSeconds;
    private int totalQuestions;
    private double totalMarks;
    private boolean proctoringEnabled;
    private boolean fullScreenRequired;
    private int maxViolations;
    private boolean autoSubmitOnViolation;
    @Builder.Default
    private List<CandidateExamQuestionResponse> questions = new ArrayList<>();
}
