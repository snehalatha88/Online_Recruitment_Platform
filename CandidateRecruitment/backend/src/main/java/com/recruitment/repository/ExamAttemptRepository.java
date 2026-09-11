package com.recruitment.repository;

import com.recruitment.entity.ExamAttempt;
import com.recruitment.entity.enums.AttemptStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    List<ExamAttempt> findByCandidateId(Long candidateId);
    List<ExamAttempt> findByCandidateIdAndExamId(Long candidateId, Long examId);
    List<ExamAttempt> findByExamId(Long examId);
    List<ExamAttempt> findByStatus(AttemptStatus status);
    long countByStatus(AttemptStatus status);

    List<ExamAttempt> findByStatusAndExpectedEndTimeBefore(AttemptStatus status, Instant time);

    @Query("SELECT COUNT(ea) FROM ExamAttempt ea WHERE ea.candidate.id = :candidateId AND ea.exam.id = :examId")
    int countAttemptsByCandidateAndExam(@Param("candidateId") Long candidateId, @Param("examId") Long examId);

    @Query("SELECT ea FROM ExamAttempt ea WHERE " +
           "(:examId IS NULL OR ea.exam.id = :examId) AND " +
           "(:candidateId IS NULL OR ea.candidate.id = :candidateId) AND " +
           "(:status IS NULL OR ea.status = :status)")
    Page<ExamAttempt> searchAttempts(@Param("examId") Long examId,
                                     @Param("candidateId") Long candidateId,
                                     @Param("status") AttemptStatus status,
                                     Pageable pageable);
}
