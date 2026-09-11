package com.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exam_questions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_exam_question", columnNames = {"exam_id", "question_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private int questionOrder;

    private Double customMarks;
}
