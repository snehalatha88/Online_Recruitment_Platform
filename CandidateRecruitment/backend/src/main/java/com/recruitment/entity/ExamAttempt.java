package com.recruitment.entity;

import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.SubmissionReason;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exam_attempts", indexes = {
        @Index(name = "idx_attempts_candidate", columnList = "candidate_id"),
        @Index(name = "idx_attempts_exam", columnList = "exam_id"),
        @Index(name = "idx_attempts_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Column(nullable = false)
    private Instant startTime;

    @Column(nullable = false)
    private Instant expectedEndTime;

    private Instant submissionTime;

    @Enumerated(EnumType.STRING)
    @Column(length = 25, nullable = false)
    @Builder.Default
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SubmissionReason submissionReason;

    @Column(nullable = false)
    @Builder.Default
    private int violationCount = 0;

    @Version
    private Long version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Answer> answers = new ArrayList<>();

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CodingSubmission> codingSubmissions = new ArrayList<>();

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProctoringViolation> violations = new ArrayList<>();

    @OneToOne(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private ExamResult result;
}
