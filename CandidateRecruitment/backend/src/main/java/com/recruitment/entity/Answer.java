package com.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "answers", uniqueConstraints = {
        @UniqueConstraint(name = "uk_attempt_question", columnNames = {"attempt_id", "question_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    // Comma-separated list or JSON array of selected option IDs (e.g. "1" or "1,3,4")
    @Column(columnDefinition = "TEXT")
    private String selectedOptionIds;

    @Column(nullable = false)
    @Builder.Default
    private boolean isMarkedForReview = false;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant answeredAt;
}
