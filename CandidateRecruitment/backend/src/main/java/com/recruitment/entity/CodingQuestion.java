package com.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "coding_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodingQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private Question question;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String problemStatement;

    @Column(columnDefinition = "TEXT")
    private String inputFormat;

    @Column(columnDefinition = "TEXT")
    private String outputFormat;

    @Column(columnDefinition = "TEXT")
    private String constraints;

    @Column(columnDefinition = "TEXT")
    private String sampleInput;

    @Column(columnDefinition = "TEXT")
    private String sampleOutput;

    @Column(length = 200, nullable = false)
    @Builder.Default
    private String allowedLanguages = "JAVA,PYTHON,CPP,C,JAVASCRIPT";

    @Column(nullable = false)
    @Builder.Default
    private int timeLimitMs = 2000;

    @Column(nullable = false)
    @Builder.Default
    private int memoryLimitMb = 256;

    @Column(columnDefinition = "TEXT")
    private String starterCodeTemplates; // JSON map of language -> template

    @OneToMany(mappedBy = "codingQuestion", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TestCase> testCases = new ArrayList<>();
}
