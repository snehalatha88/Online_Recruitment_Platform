package com.recruitment.repository;

import com.recruitment.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT al FROM AuditLog al WHERE " +
           "(:userId IS NULL OR al.userId = :userId) AND " +
           "(:action IS NULL OR al.action = :action) AND " +
           "(:startTime IS NULL OR al.timestamp >= :startTime) AND " +
           "(:endTime IS NULL OR al.timestamp <= :endTime) AND " +
           "(:query IS NULL OR LOWER(al.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(al.details) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<AuditLog> searchAuditLogs(@Param("userId") Long userId,
                                  @Param("action") String action,
                                  @Param("startTime") Instant startTime,
                                  @Param("endTime") Instant endTime,
                                  @Param("query") String query,
                                  Pageable pageable);

    @Query("SELECT DISTINCT al.action FROM AuditLog al ORDER BY al.action")
    List<String> findAllDistinctActions();
}
