package com.recruitment.repository;

import com.recruitment.entity.ExamResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {
    List<ExamResult> findByCandidateId(Long candidateId);
    Optional<ExamResult> findByAttemptId(Long attemptId);
    boolean existsByAttemptId(Long attemptId);

    @Query("SELECT er FROM ExamResult er WHERE " +
           "(:examId IS NULL OR er.exam.id = :examId) AND " +
           "(:candidateId IS NULL OR er.candidate.id = :candidateId) AND " +
           "(:isPassed IS NULL OR er.isPassed = :isPassed) AND " +
           "(:query IS NULL OR " +
           "LOWER(er.candidate.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(er.candidate.candidateId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(er.exam.title) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<ExamResult> searchResults(@Param("examId") Long examId,
                                   @Param("candidateId") Long candidateId,
                                   @Param("isPassed") Boolean isPassed,
                                   @Param("query") String query,
                                   Pageable pageable);

    @Query("SELECT AVG(er.percentage) FROM ExamResult er")
    Double calculateOverallAveragePercentage();

    @Query("SELECT COUNT(er) FROM ExamResult er WHERE er.isPassed = true")
    long countPassedResults();
}
