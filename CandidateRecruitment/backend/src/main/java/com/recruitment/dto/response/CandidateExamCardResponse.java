package com.recruitment.dto.response;

import com.recruitment.entity.enums.AssignmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateExamCardResponse {
    private Long assignmentId;
    private Long examId;
    private String title;
    private String description;
    private String instructions;
    private int durationMinutes;
    private double passingPercentage;
    private int questionCount;
    private double totalMarks;
    private boolean proctoringEnabled;
    private boolean fullScreenRequired;
    private int maxViolations;
    private AssignmentStatus assignmentStatus;
    private Instant dueDate;
    private int attemptCount;
    private int maxAttempts;
    private boolean canStart;
    private Long activeAttemptId;
}
