package com.recruitment.dto.response;

import com.recruitment.entity.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateFullDetailResponse {

    // 1. Candidate Registration Details
    private Long id;
    private Long userId;
    private String candidateId;
    private String employeeId;
    private String fullName;
    private LocalDate dob;
    private String aadharNumber;
    private String phone;
    private String gender;
    private String department; // Institute
    private String designation; // Role
    private String panNumber;
    private String email;
    private String username;
    private UserStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    // 2. Candidate Exam Statistics
    private int totalAssignedExams;
    private int totalAttemptedExams;
    private int totalPassedExams;
    private int totalFailedExams;
    private int totalWarningsReceived;

    // 3. Detailed Exam History
    @Builder.Default
    private List<CandidateExamSummaryDto> exams = new ArrayList<>();
}
