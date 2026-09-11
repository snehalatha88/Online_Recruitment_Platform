package com.recruitment.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.recruitment.entity.enums.SubmissionReason;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResultResponse {
    private Long id;
    private Long attemptId;
    private Long examId;
    private String examTitle;
    private Long candidateId;
    private String candidateFullName;
    private String candidateCode;
    private String candidateEmail;
    private String department;
    private double totalScore;
    private double maxScore;
    private double percentage;

    @JsonProperty("isPassed")
    private Boolean isPassed;

    @JsonProperty("isPassed")
    public Boolean getIsPassed() {
        return isPassed;
    }

    public boolean isPassed() {
        return Boolean.TRUE.equals(isPassed);
    }
    private double mcqScore;
    private double codingScore;
    private int totalQuestions;
    private int correctAnswersCount;
    private int wrongAnswersCount;
    private int unansweredCount;
    private Instant startTime;
    private Instant submissionTime;
    private SubmissionReason submissionReason;
    private int violationCount;
    private Instant evaluatedAt;
}
