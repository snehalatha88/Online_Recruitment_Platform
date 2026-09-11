package com.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "exam_results", indexes = {
        @Index(name = "idx_results_candidate", columnList = "candidate_id"),
        @Index(name = "idx_results_exam", columnList = "exam_id"),
        @Index(name = "idx_results_is_passed", columnList = "isPassed")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false, unique = true)
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Column(nullable = false)
    private double totalScore;

    @Column(nullable = false)
    private double maxScore;

    @Column(nullable = false)
    private double percentage;

    @Column(nullable = false)
    private boolean isPassed;

    @Column(nullable = false)
    @Builder.Default
    private double mcqScore = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private double codingScore = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private int totalQuestions = 0;

    @Column(nullable = false)
    @Builder.Default
    private int correctAnswersCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int wrongAnswersCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int unansweredCount = 0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant evaluatedAt;
}
