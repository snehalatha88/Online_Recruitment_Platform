package com.recruitment.repository;

import com.recruitment.entity.Exam;
import com.recruitment.entity.enums.ExamStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByStatus(ExamStatus status);
    long countByStatus(ExamStatus status);

    @Query("SELECT e FROM Exam e WHERE " +
           "(:query IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.description) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:status IS NULL OR e.status = :status)")
    Page<Exam> searchExams(@Param("query") String query,
                           @Param("status") ExamStatus status,
                           Pageable pageable);
}
