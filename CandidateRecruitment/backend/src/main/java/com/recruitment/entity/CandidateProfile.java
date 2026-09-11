package com.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "candidate_profiles", indexes = {
        @Index(name = "idx_candidates_candidate_id", columnList = "candidateId"),
        @Index(name = "idx_candidates_employee_id", columnList = "employeeId"),
        @Index(name = "idx_candidates_department", columnList = "department"),
        @Index(name = "idx_candidates_aadhar", columnList = "aadharNumber"),
        @Index(name = "idx_candidates_phone", columnList = "phone"),
        @Index(name = "idx_candidates_pan", columnList = "panNumber")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true, length = 50)
    private String candidateId;

    @Column(length = 50)
    private String employeeId;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(name = "dob")
    private LocalDate dob;

    @Column(length = 20)
    private String aadharNumber;

    @Column(length = 25)
    private String phone;

    @Column(length = 20)
    private String gender;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 100)
    private String designation;

    @Column(length = 20)
    private String panNumber;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<ExamAssignment> assignments = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<ExamAttempt> attempts = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<ExamResult> results = new java.util.ArrayList<>();
}
