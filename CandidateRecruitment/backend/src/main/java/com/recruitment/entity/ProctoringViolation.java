package com.recruitment.entity;

import com.recruitment.entity.enums.ViolationAction;
import com.recruitment.entity.enums.ViolationSeverity;
import com.recruitment.entity.enums.ViolationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "proctoring_violations", indexes = {
        @Index(name = "idx_violations_attempt", columnList = "attempt_id"),
        @Index(name = "idx_violations_candidate", columnList = "candidate_id"),
        @Index(name = "idx_violations_type", columnList = "violationType")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Enumerated(EnumType.STRING)
    @Column(length = 35, nullable = false)
    private ViolationType violationType;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant timestamp;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private ViolationSeverity severity = ViolationSeverity.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(length = 25, nullable = false)
    @Builder.Default
    private ViolationAction actionTaken = ViolationAction.WARNING;
}
