package com.recruitment.dto.response;

import com.recruitment.entity.enums.AttemptStatus;
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
public class CandidateExamSummaryDto {

    private Long assignmentId;
    private Long examId;
    private String examTitle;
    private String examDescription;
    private int durationMinutes;
    private double passPercentage;
    private double totalMarks;

    // Attempt Details
    private Long attemptId;
    private AttemptStatus attemptStatus;
    private SubmissionReason submissionReason;
    private int warningCount; // Violation/Warning count received during proctoring
    private Instant startTime;
    private Instant submissionTime;

    // Evaluation Results
    private Long resultId;
    private Double score;
    private Double maxScore;
    private Double percentage;
    private Boolean isPassed; // null if not yet evaluated, true = PASSED, false = FAILED
    private Double mcqScore;
    private Double codingScore;
    private Integer totalQuestions;
    private Integer correctAnswersCount;
    private Integer wrongAnswersCount;
    private Integer unansweredCount;
    private Instant evaluatedAt;
}
