package com.recruitment.repository;

import com.recruitment.entity.CandidateProfile;
import com.recruitment.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile, Long> {
    Optional<CandidateProfile> findByCandidateId(String candidateId);
    Optional<CandidateProfile> findByEmployeeId(String employeeId);
    Optional<CandidateProfile> findByUser(User user);
    Optional<CandidateProfile> findByUserId(Long userId);
    Optional<CandidateProfile> findByAadharNumber(String aadharNumber);
    Optional<CandidateProfile> findByPhone(String phone);
    Optional<CandidateProfile> findByPanNumber(String panNumber);
    boolean existsByCandidateId(String candidateId);
    boolean existsByEmployeeId(String employeeId);
    boolean existsByAadharNumber(String aadharNumber);
    boolean existsByPhone(String phone);
    boolean existsByPanNumber(String panNumber);

    @Query("SELECT cp FROM CandidateProfile cp WHERE " +
           "(:query IS NULL OR LOWER(cp.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(cp.candidateId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(cp.user.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(cp.user.username) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:department IS NULL OR cp.department = :department)")
    Page<CandidateProfile> searchCandidates(@Param("query") String query,
                                            @Param("department") String department,
                                            Pageable pageable);

    @Query("SELECT DISTINCT cp.department FROM CandidateProfile cp ORDER BY cp.department")
    List<String> findAllDistinctDepartments();
}
