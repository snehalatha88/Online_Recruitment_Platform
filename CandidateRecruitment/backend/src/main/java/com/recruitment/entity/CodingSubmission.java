package com.recruitment.entity;

import com.recruitment.entity.enums.ExecutionStatus;
import com.recruitment.entity.enums.Language;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "coding_submissions", indexes = {
        @Index(name = "idx_submissions_attempt", columnList = "attempt_id"),
        @Index(name = "idx_submissions_question", columnList = "coding_question_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodingSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coding_question_id", nullable = false)
    private CodingQuestion codingQuestion;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Language language;

    @Column(columnDefinition = "MEDIUMTEXT", nullable = false)
    private String sourceCode;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private ExecutionStatus executionStatus;

    @Column(nullable = false)
    @Builder.Default
    private int testCasesPassed = 0;

    @Column(nullable = false)
    @Builder.Default
    private int totalTestCases = 0;

    @Column(nullable = false)
    @Builder.Default
    private double scoreAwarded = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private long executionTimeMs = 0;

    @Column(nullable = false)
    @Builder.Default
    private long memoryUsedKb = 0;

    @Column(columnDefinition = "TEXT")
    private String compilerOutput;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant submittedAt;
}
