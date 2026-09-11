package com.recruitment.dto.response;

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
public class DashboardStatsResponse {

    private long totalCandidates;
    private long activeCandidates;
    private long totalExams;
    private long publishedExams;
    private long totalAttempts;
    private long completedAttempts;
    private long inProgressAttempts;
    private double averageScore;
    private double passRate;
    private long totalViolations;

    @Builder.Default
    private List<ExamResultResponse> recentResults = new ArrayList<>();

    @Builder.Default
    private List<ExamPerformanceStat> examStats = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamPerformanceStat {
        private Long examId;
        private String examTitle;
        private int totalAttempts;
        private int passedCount;
        private double averagePercentage;
    }
}
