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
public class ExamAssignmentResponse {
    private Long id;
    private Long examId;
    private String examTitle;
    private String examDescription;
    private Integer durationMinutes;
    private Double passingPercentage;
    private Long candidateId;
    private String candidateFullName;
    private String candidateCode;
    private String candidateEmail;
    private String candidateDepartment;
    private String assignedByUsername;
    private Instant assignedAt;
    private Instant dueDate;
    private AssignmentStatus status;
    private int attemptCount;
    private int maxAttempts;
}
