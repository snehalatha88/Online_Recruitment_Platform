package com.recruitment.repository;

import com.recruitment.entity.ExamAssignment;
import com.recruitment.entity.enums.AssignmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAssignmentRepository extends JpaRepository<ExamAssignment, Long> {
    List<ExamAssignment> findByCandidateId(Long candidateId);
    Optional<ExamAssignment> findByExamIdAndCandidateId(Long examId, Long candidateId);
    boolean existsByExamIdAndCandidateId(Long examId, Long candidateId);

    @Query("SELECT ea FROM ExamAssignment ea WHERE " +
           "(:examId IS NULL OR ea.exam.id = :examId) AND " +
           "(:candidateId IS NULL OR ea.candidate.id = :candidateId) AND " +
           "(:status IS NULL OR ea.status = :status)")
    Page<ExamAssignment> searchAssignments(@Param("examId") Long examId,
                                           @Param("candidateId") Long candidateId,
                                           @Param("status") AssignmentStatus status,
                                           Pageable pageable);
}
