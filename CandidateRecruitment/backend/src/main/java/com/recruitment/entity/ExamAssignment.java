package com.recruitment.entity;

import com.recruitment.entity.enums.AssignmentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "exam_assignments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_exam_candidate", columnNames = {"exam_id", "candidate_id"})
}, indexes = {
        @Index(name = "idx_assignments_candidate", columnList = "candidate_id"),
        @Index(name = "idx_assignments_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant assignedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_user_id")
    private User assignedBy;

    private Instant dueDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(nullable = false)
    @Builder.Default
    private int attemptCount = 0;
}
