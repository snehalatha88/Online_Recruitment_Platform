package com.recruitment.repository;

import com.recruitment.entity.CodingSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CodingSubmissionRepository extends JpaRepository<CodingSubmission, Long> {
    List<CodingSubmission> findByAttemptId(Long attemptId);
    Optional<CodingSubmission> findByAttemptIdAndCodingQuestionId(Long attemptId, Long codingQuestionId);
}
