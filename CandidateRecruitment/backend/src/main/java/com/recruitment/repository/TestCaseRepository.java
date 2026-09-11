package com.recruitment.repository;

import com.recruitment.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
    List<TestCase> findByCodingQuestionIdOrderByOrderIndexAsc(Long codingQuestionId);
    List<TestCase> findByCodingQuestionIdAndIsHiddenFalseOrderByOrderIndexAsc(Long codingQuestionId);
}
