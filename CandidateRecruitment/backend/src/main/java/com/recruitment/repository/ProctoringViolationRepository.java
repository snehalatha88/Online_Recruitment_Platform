package com.recruitment.repository;

import com.recruitment.entity.ProctoringViolation;
import com.recruitment.entity.enums.ViolationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProctoringViolationRepository extends JpaRepository<ProctoringViolation, Long> {
    List<ProctoringViolation> findByAttemptIdOrderByTimestampAsc(Long attemptId);
    List<ProctoringViolation> findByCandidateId(Long candidateId);
    long countByAttemptId(Long attemptId);

    @Query("SELECT pv FROM ProctoringViolation pv WHERE " +
           "(:attemptId IS NULL OR pv.attempt.id = :attemptId) AND " +
           "(:candidateId IS NULL OR pv.candidate.id = :candidateId) AND " +
           "(:type IS NULL OR pv.violationType = :type)")
    Page<ProctoringViolation> searchViolations(@Param("attemptId") Long attemptId,
                                               @Param("candidateId") Long candidateId,
                                               @Param("type") ViolationType type,
                                               Pageable pageable);
}
