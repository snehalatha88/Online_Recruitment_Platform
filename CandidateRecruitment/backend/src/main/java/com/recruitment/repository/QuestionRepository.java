package com.recruitment.repository;

import com.recruitment.entity.Question;
import com.recruitment.entity.enums.DifficultyLevel;
import com.recruitment.entity.enums.QuestionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByQuestionType(QuestionType questionType);
    List<Question> findByCategory(String category);

    @Query("SELECT q FROM Question q WHERE " +
           "(:query IS NULL OR LOWER(q.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(q.questionText) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:type IS NULL OR q.questionType = :type) AND " +
           "(:difficulty IS NULL OR q.difficulty = :difficulty) AND " +
           "(:category IS NULL OR q.category = :category)")
    Page<Question> searchQuestions(@Param("query") String query,
                                   @Param("type") QuestionType type,
                                   @Param("difficulty") DifficultyLevel difficulty,
                                   @Param("category") String category,
                                   Pageable pageable);

    @Query("SELECT DISTINCT q.category FROM Question q ORDER BY q.category")
    List<String> findAllDistinctCategories();
}
