package com.recruitment.repository;

import com.recruitment.entity.ExamQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, Long> {
    List<ExamQuestion> findByExamIdOrderByQuestionOrderAsc(Long examId);
    Optional<ExamQuestion> findByExamIdAndQuestionId(Long examId, Long questionId);

    @Modifying
    @Query("DELETE FROM ExamQuestion eq WHERE eq.exam.id = :examId")
    void deleteByExamId(@Param("examId") Long examId);
}
