package com.recruitment.entity;

import com.recruitment.entity.enums.ExamStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exams", indexes = {
        @Index(name = "idx_exams_status", columnList = "status"),
        @Index(name = "idx_exams_start_time", columnList = "startDateTime"),
        @Index(name = "idx_exams_end_time", columnList = "endDateTime")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(nullable = false)
    @Builder.Default
    private int durationMinutes = 60;

    @Column(nullable = false)
    @Builder.Default
    private double passingPercentage = 60.0;

    @Column(nullable = false)
    @Builder.Default
    private int maxAttempts = 1;

    private Instant startDateTime;

    private Instant endDateTime;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private ExamStatus status = ExamStatus.DRAFT;

    @Column(nullable = false)
    @Builder.Default
    private boolean negativeMarkingEnabled = false;

    @Column(nullable = false)
    @Builder.Default
    private double negativeMarksPerWrong = 0.25;

    @Column(nullable = false)
    @Builder.Default
    private boolean randomizeQuestions = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean proctoringEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean fullScreenRequired = true;

    @Column(nullable = false)
    @Builder.Default
    private int maxViolations = 3;

    @Column(nullable = false)
    @Builder.Default
    private boolean autoSubmitOnViolation = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    @Builder.Default
    private List<ExamQuestion> examQuestions = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}
