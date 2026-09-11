package com.recruitment.dto.response;

import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.QuestionType;
import com.recruitment.entity.enums.SubmissionReason;
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
public class AttemptDetailResponse {

    // Candidate Profile
    private Long candidateId;
    private String candidateFullName;
    private String candidateCode;
    private String candidateEmail;
    private String candidatePhone;
    private String department;
    private String designation;

    // Exam Info
    private Long examId;
    private String examTitle;
    private int durationMinutes;
    private double passingPercentage;

    // Attempt Info
    private Long attemptId;
    private AttemptStatus status;
    private SubmissionReason submissionReason;
    private Instant startTime;
    private Instant submissionTime;
    private int violationCount;

    // Score Info
    private Double totalScore;
    private Double maxScore;
    private Double percentage;
    @com.fasterxml.jackson.annotation.JsonProperty("isPassed")
    private Boolean isPassed;
    private Double mcqScore;
    private Double codingScore;
    private Integer totalQuestions;
    private Integer correctAnswersCount;
    private Integer wrongAnswersCount;
    private Integer unansweredCount;

    // Detailed lists
    @Builder.Default
    private List<QuestionReviewItem> questionReviews = new ArrayList<>();

    @Builder.Default
    private List<CodingSubmissionResponse> codingSubmissions = new ArrayList<>();

    @Builder.Default
    private List<ProctoringViolationResponse> violations = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionReviewItem {
        private Long questionId;
        private int order;
        private String title;
        private String questionText;
        private QuestionType questionType;
        private double maxMarks;
        private double marksAwarded;
        private String candidateAnswerIds;
        private String candidateAnswerText;
        private String correctAnswerText;
        private boolean isCorrect;
        private boolean isAnswered;
        private String explanation;
        @Builder.Default
        private List<QuestionOptionResponse> options = new ArrayList<>();
    }
}
