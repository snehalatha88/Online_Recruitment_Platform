package com.recruitment.service;

import com.recruitment.dto.request.CandidateCreateRequest;
import com.recruitment.dto.request.CandidateUpdateRequest;
import com.recruitment.dto.response.CandidateExamSummaryDto;
import com.recruitment.dto.response.CandidateFullDetailResponse;
import com.recruitment.dto.response.CandidateResponse;
import com.recruitment.entity.*;
import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.RoleName;
import com.recruitment.entity.enums.UserStatus;
import com.recruitment.exception.ConflictException;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.*;
import com.recruitment.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RoleRepository roleRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final ExamResultRepository examResultRepository;
    private final AnswerRepository answerRepository;
    private final CodingSubmissionRepository codingSubmissionRepository;
    private final ProctoringViolationRepository proctoringViolationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private String sanitizePhone(String phone) {
        if (!StringUtils.hasText(phone)) return null;
        return phone.replaceAll("[\\s-]", "").trim();
    }

    private String sanitizeAadhar(String aadhar) {
        if (!StringUtils.hasText(aadhar)) return null;
        return aadhar.replaceAll("[\\s-]", "").trim();
    }

    private String sanitizePan(String pan) {
        if (!StringUtils.hasText(pan)) return null;
        return pan.replaceAll("[\\s-]", "").trim().toUpperCase();
    }

    @Transactional
    public CandidateResponse createCandidate(CandidateCreateRequest request) {
        String username = request.getUsername().trim();
        String emailToUse = StringUtils.hasText(request.getEmail())
                ? request.getEmail().trim().toLowerCase()
                : username.toLowerCase() + "@candidate.portal";
        String candidateId = request.getCandidateId().trim().toUpperCase();
        String sanitizedPhone = sanitizePhone(request.getPhone());
        String sanitizedAadhar = sanitizeAadhar(request.getAadharNumber());
        String sanitizedPan = sanitizePan(request.getPanNumber());

        // Uniqueness checks
        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("Username '" + username + "' is already taken.");
        }
        if (userRepository.existsByEmail(emailToUse)) {
            throw new ConflictException("Email '" + emailToUse + "' is already in use.");
        }
        if (candidateProfileRepository.existsByCandidateId(candidateId)) {
            throw new ConflictException("Candidate ID '" + candidateId + "' already exists.");
        }
        if (StringUtils.hasText(request.getEmployeeId()) && candidateProfileRepository.existsByEmployeeId(request.getEmployeeId().trim())) {
            throw new ConflictException("Employee ID '" + request.getEmployeeId().trim() + "' already exists.");
        }
        if (StringUtils.hasText(sanitizedPhone) && candidateProfileRepository.existsByPhone(sanitizedPhone)) {
            throw new ConflictException("Phone number '" + request.getPhone().trim() + "' is already registered with another candidate.");
        }
        if (StringUtils.hasText(sanitizedAadhar) && candidateProfileRepository.existsByAadharNumber(sanitizedAadhar)) {
            throw new ConflictException("Aadhar number '" + request.getAadharNumber().trim() + "' is already registered with another candidate.");
        }
        if (StringUtils.hasText(sanitizedPan) && candidateProfileRepository.existsByPanNumber(sanitizedPan)) {
            throw new ConflictException("PAN number '" + sanitizedPan + "' is already registered with another candidate.");
        }

        Role candidateRole = roleRepository.findByName(RoleName.ROLE_CANDIDATE)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_CANDIDATE).build()));

        User user = User.builder()
                .username(username)
                .email(emailToUse)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(candidateRole)
                .status(request.getStatus() != null ? request.getStatus() : UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        CandidateProfile profile = CandidateProfile.builder()
                .user(savedUser)
                .candidateId(candidateId)
                .employeeId(StringUtils.hasText(request.getEmployeeId()) ? request.getEmployeeId().trim() : null)
                .fullName(request.getFullName().trim())
                .dob(request.getDob())
                .aadharNumber(sanitizedAadhar)
                .phone(sanitizedPhone)
                .gender(request.getGender() != null ? request.getGender().trim().toUpperCase() : "MALE")
                .department(request.getDepartment().trim())
                .designation(request.getDesignation() != null ? request.getDesignation().trim() : "Candidate")
                .panNumber(sanitizedPan)
                .build();

        CandidateProfile savedProfile = candidateProfileRepository.save(profile);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "CANDIDATE_CREATED",
                null, null,
                "Created candidate: " + savedProfile.getFullName() + " (" + savedProfile.getCandidateId() + ")"
        );

        return mapToResponse(savedProfile);
    }

    @Transactional
    public CandidateResponse updateCandidate(Long id, CandidateUpdateRequest request) {
        CandidateProfile profile = candidateProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found with id: " + id));

        User user = profile.getUser();

        // Email conflict check
        if (StringUtils.hasText(request.getEmail())) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!user.getEmail().equalsIgnoreCase(newEmail) && userRepository.existsByEmail(newEmail)) {
                throw new ConflictException("Email '" + newEmail + "' is already in use by another user.");
            }
            user.setEmail(newEmail);
        }

        // Employee ID conflict check
        if (StringUtils.hasText(request.getEmployeeId()) &&
                !request.getEmployeeId().equalsIgnoreCase(profile.getEmployeeId()) &&
                candidateProfileRepository.existsByEmployeeId(request.getEmployeeId().trim())) {
            throw new ConflictException("Employee ID '" + request.getEmployeeId().trim() + "' is already in use.");
        }

        String sanitizedPhone = sanitizePhone(request.getPhone());
        String sanitizedAadhar = sanitizeAadhar(request.getAadharNumber());
        String sanitizedPan = sanitizePan(request.getPanNumber());

        // Phone conflict check
        if (StringUtils.hasText(sanitizedPhone)) {
            if (!sanitizedPhone.equalsIgnoreCase(profile.getPhone()) && candidateProfileRepository.existsByPhone(sanitizedPhone)) {
                throw new ConflictException("Phone number '" + request.getPhone().trim() + "' is already registered with another candidate.");
            }
            profile.setPhone(sanitizedPhone);
        }

        // Aadhar conflict check
        if (StringUtils.hasText(sanitizedAadhar)) {
            if (!sanitizedAadhar.equalsIgnoreCase(profile.getAadharNumber()) && candidateProfileRepository.existsByAadharNumber(sanitizedAadhar)) {
                throw new ConflictException("Aadhar number '" + request.getAadharNumber().trim() + "' is already registered with another candidate.");
            }
            profile.setAadharNumber(sanitizedAadhar);
        }

        // PAN conflict check
        if (StringUtils.hasText(sanitizedPan)) {
            if (!sanitizedPan.equalsIgnoreCase(profile.getPanNumber()) && candidateProfileRepository.existsByPanNumber(sanitizedPan)) {
                throw new ConflictException("PAN number '" + sanitizedPan + "' is already registered with another candidate.");
            }
            profile.setPanNumber(sanitizedPan);
        } else if (request.getPanNumber() != null && request.getPanNumber().trim().isEmpty()) {
            profile.setPanNumber(null);
        }

        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        if (StringUtils.hasText(request.getNewPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }
        userRepository.save(user);

        profile.setFullName(request.getFullName().trim());
        profile.setEmployeeId(StringUtils.hasText(request.getEmployeeId()) ? request.getEmployeeId().trim() : null);
        if (request.getDob() != null) {
            profile.setDob(request.getDob());
        }
        if (StringUtils.hasText(request.getGender())) {
            profile.setGender(request.getGender().trim().toUpperCase());
        }
        profile.setDepartment(request.getDepartment().trim());
        if (StringUtils.hasText(request.getDesignation())) {
            profile.setDesignation(request.getDesignation().trim());
        }

        CandidateProfile updatedProfile = candidateProfileRepository.save(profile);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "CANDIDATE_UPDATED",
                null, null,
                "Updated candidate: " + updatedProfile.getFullName() + " (" + updatedProfile.getCandidateId() + ")"
        );

        return mapToResponse(updatedProfile);
    }

    @Transactional(readOnly = true)
    public CandidateResponse getCandidateById(Long id) {
        CandidateProfile profile = candidateProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found with id: " + id));
        return mapToResponse(profile);
    }

    @Transactional(readOnly = true)
    public CandidateFullDetailResponse getCandidateFullDetails(Long id) {
        CandidateProfile profile = candidateProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found with id: " + id));

        List<ExamAssignment> assignments = assignmentRepository.findByCandidateId(profile.getId());
        List<ExamAttempt> attempts = examAttemptRepository.findByCandidateId(profile.getId());
        List<ExamResult> results = examResultRepository.findByCandidateId(profile.getId());

        Map<Long, ExamResult> resultsByAttemptId = results.stream()
                .filter(r -> r.getAttempt() != null)
                .collect(Collectors.toMap(r -> r.getAttempt().getId(), r -> r, (r1, r2) -> r1));

        Map<Long, List<ExamAttempt>> attemptsByExamId = attempts.stream()
                .collect(Collectors.groupingBy(a -> a.getExam().getId()));

        List<CandidateExamSummaryDto> examSummaries = new ArrayList<>();
        int totalWarnings = 0;
        int passedCount = 0;
        int failedCount = 0;

        Set<Long> processedExamIds = new HashSet<>();
        for (ExamAssignment assignment : assignments) {
            Exam exam = assignment.getExam();
            processedExamIds.add(exam.getId());
            List<ExamAttempt> examAttempts = attemptsByExamId.getOrDefault(exam.getId(), Collections.emptyList());

            if (examAttempts.isEmpty()) {
                examSummaries.add(CandidateExamSummaryDto.builder()
                        .assignmentId(assignment.getId())
                        .examId(exam.getId())
                        .examTitle(exam.getTitle())
                        .examDescription(exam.getDescription())
                        .durationMinutes(exam.getDurationMinutes())
                        .passPercentage(exam.getPassingPercentage())
                        .totalMarks(0.0)
                        .attemptStatus(null)
                        .warningCount(0)
                        .isPassed(null)
                        .build());
            } else {
                for (ExamAttempt attempt : examAttempts) {
                    ExamResult result = resultsByAttemptId.get(attempt.getId());
                    totalWarnings += attempt.getViolationCount();

                    Boolean isPassed = null;
                    if (result != null) {
                        isPassed = result.isPassed();
                        if (isPassed) {
                            passedCount++;
                        } else {
                            failedCount++;
                        }
                    } else if (attempt.getStatus() == AttemptStatus.DISQUALIFIED || attempt.getStatus() == AttemptStatus.EXPIRED) {
                        isPassed = false;
                        failedCount++;
                    }

                    examSummaries.add(CandidateExamSummaryDto.builder()
                            .assignmentId(assignment.getId())
                            .examId(exam.getId())
                            .examTitle(exam.getTitle())
                            .examDescription(exam.getDescription())
                            .durationMinutes(exam.getDurationMinutes())
                            .passPercentage(exam.getPassingPercentage())
                            .totalMarks(result != null ? result.getMaxScore() : 0.0)
                            .attemptId(attempt.getId())
                            .attemptStatus(attempt.getStatus())
                            .submissionReason(attempt.getSubmissionReason())
                            .warningCount(attempt.getViolationCount())
                            .startTime(attempt.getStartTime())
                            .submissionTime(attempt.getSubmissionTime())
                            .resultId(result != null ? result.getId() : null)
                            .score(result != null ? result.getTotalScore() : null)
                            .maxScore(result != null ? result.getMaxScore() : null)
                            .percentage(result != null ? result.getPercentage() : null)
                            .isPassed(isPassed)
                            .mcqScore(result != null ? result.getMcqScore() : null)
                            .codingScore(result != null ? result.getCodingScore() : null)
                            .totalQuestions(result != null ? result.getTotalQuestions() : null)
                            .correctAnswersCount(result != null ? result.getCorrectAnswersCount() : null)
                            .wrongAnswersCount(result != null ? result.getWrongAnswersCount() : null)
                            .unansweredCount(result != null ? result.getUnansweredCount() : null)
                            .evaluatedAt(result != null ? result.getEvaluatedAt() : null)
                            .build());
                }
            }
        }

        for (ExamAttempt attempt : attempts) {
            if (!processedExamIds.contains(attempt.getExam().getId())) {
                Exam exam = attempt.getExam();
                ExamResult result = resultsByAttemptId.get(attempt.getId());
                totalWarnings += attempt.getViolationCount();

                Boolean isPassed = null;
                if (result != null) {
                    isPassed = result.isPassed();
                    if (isPassed) {
                        passedCount++;
                    } else {
                        failedCount++;
                    }
                } else if (attempt.getStatus() == AttemptStatus.DISQUALIFIED || attempt.getStatus() == AttemptStatus.EXPIRED) {
                    isPassed = false;
                    failedCount++;
                }

                examSummaries.add(CandidateExamSummaryDto.builder()
                        .assignmentId(null)
                        .examId(exam.getId())
                        .examTitle(exam.getTitle())
                        .examDescription(exam.getDescription())
                        .durationMinutes(exam.getDurationMinutes())
                        .passPercentage(exam.getPassingPercentage())
                        .totalMarks(result != null ? result.getMaxScore() : 0.0)
                        .attemptId(attempt.getId())
                        .attemptStatus(attempt.getStatus())
                        .submissionReason(attempt.getSubmissionReason())
                        .warningCount(attempt.getViolationCount())
                        .startTime(attempt.getStartTime())
                        .submissionTime(attempt.getSubmissionTime())
                        .resultId(result != null ? result.getId() : null)
                        .score(result != null ? result.getTotalScore() : null)
                        .maxScore(result != null ? result.getMaxScore() : null)
                        .percentage(result != null ? result.getPercentage() : null)
                        .isPassed(isPassed)
                        .mcqScore(result != null ? result.getMcqScore() : null)
                        .codingScore(result != null ? result.getCodingScore() : null)
                        .totalQuestions(result != null ? result.getTotalQuestions() : null)
                        .correctAnswersCount(result != null ? result.getCorrectAnswersCount() : null)
                        .wrongAnswersCount(result != null ? result.getWrongAnswersCount() : null)
                        .unansweredCount(result != null ? result.getUnansweredCount() : null)
                        .evaluatedAt(result != null ? result.getEvaluatedAt() : null)
                        .build());
            }
        }

        return CandidateFullDetailResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .candidateId(profile.getCandidateId())
                .employeeId(profile.getEmployeeId())
                .fullName(profile.getFullName())
                .dob(profile.getDob())
                .aadharNumber(profile.getAadharNumber())
                .phone(profile.getPhone())
                .gender(profile.getGender())
                .department(profile.getDepartment())
                .designation(profile.getDesignation())
                .panNumber(profile.getPanNumber())
                .email(profile.getUser().getEmail())
                .username(profile.getUser().getUsername())
                .status(profile.getUser().getStatus())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .totalAssignedExams(assignments.size())
                .totalAttemptedExams(attempts.size())
                .totalPassedExams(passedCount)
                .totalFailedExams(failedCount)
                .totalWarningsReceived(totalWarnings)
                .exams(examSummaries)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<CandidateResponse> searchCandidates(String query, String department, Pageable pageable) {
        String searchQuery = StringUtils.hasText(query) ? query.trim() : null;
        String searchDept = StringUtils.hasText(department) ? department.trim() : null;
        return candidateProfileRepository.searchCandidates(searchQuery, searchDept, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void toggleCandidateStatus(Long id, UserStatus newStatus) {
        CandidateProfile profile = candidateProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found with id: " + id));

        User user = profile.getUser();
        user.setStatus(newStatus);
        userRepository.save(user);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "CANDIDATE_STATUS_CHANGED",
                null, null,
                "Changed status of candidate " + profile.getCandidateId() + " to " + newStatus
        );
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        CandidateProfile profile = candidateProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found with id: " + id));

        User user = profile.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "CANDIDATE_PASSWORD_RESET",
                null, null,
                "Reset password for candidate: " + profile.getCandidateId()
        );
    }

    @Transactional
    public void deleteCandidate(Long id) {
        CandidateProfile profile = candidateProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found with id: " + id));

        User user = profile.getUser();
        String candidateCode = profile.getCandidateId();
        String fullName = profile.getFullName();

        // 1. Delete all exam results by candidate
        List<ExamResult> results = examResultRepository.findByCandidateId(profile.getId());
        if (!results.isEmpty()) {
            examResultRepository.deleteAllInBatch(results);
        }

        // 2. Delete all violations by candidate
        List<ProctoringViolation> violations = proctoringViolationRepository.findByCandidateId(profile.getId());
        if (!violations.isEmpty()) {
            proctoringViolationRepository.deleteAllInBatch(violations);
        }

        // 3. For each attempt, ensure answers, submissions, and attempt-level violations/results are purged
        List<ExamAttempt> attempts = examAttemptRepository.findByCandidateId(profile.getId());
        for (ExamAttempt attempt : attempts) {
            List<Answer> answers = answerRepository.findByAttemptId(attempt.getId());
            if (!answers.isEmpty()) {
                answerRepository.deleteAllInBatch(answers);
            }

            List<CodingSubmission> submissions = codingSubmissionRepository.findByAttemptId(attempt.getId());
            if (!submissions.isEmpty()) {
                codingSubmissionRepository.deleteAllInBatch(submissions);
            }

            List<ProctoringViolation> attemptViolations = proctoringViolationRepository.findByAttemptIdOrderByTimestampAsc(attempt.getId());
            if (!attemptViolations.isEmpty()) {
                proctoringViolationRepository.deleteAllInBatch(attemptViolations);
            }

            examResultRepository.findByAttemptId(attempt.getId()).ifPresent(examResultRepository::delete);
        }

        if (!attempts.isEmpty()) {
            examAttemptRepository.deleteAllInBatch(attempts);
        }

        // 4. Clean assignments
        List<ExamAssignment> assignments = assignmentRepository.findByCandidateId(profile.getId());
        if (!assignments.isEmpty()) {
            assignmentRepository.deleteAllInBatch(assignments);
        }

        // 5. Delete profile and user
        candidateProfileRepository.delete(profile);
        candidateProfileRepository.flush();
        userRepository.delete(user);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "CANDIDATE_DELETED",
                null, null,
                "Deleted candidate: " + fullName + " (" + candidateCode + ")"
        );
    }

    @Transactional(readOnly = true)
    public List<String> getAllDepartments() {
        return candidateProfileRepository.findAllDistinctDepartments();
    }

    public CandidateResponse mapToResponse(CandidateProfile profile) {
        return CandidateResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .candidateId(profile.getCandidateId())
                .employeeId(profile.getEmployeeId())
                .fullName(profile.getFullName())
                .dob(profile.getDob())
                .aadharNumber(profile.getAadharNumber())
                .phone(profile.getPhone())
                .gender(profile.getGender())
                .department(profile.getDepartment())
                .designation(profile.getDesignation())
                .panNumber(profile.getPanNumber())
                .email(profile.getUser().getEmail())
                .username(profile.getUser().getUsername())
                .status(profile.getUser().getStatus())
                .createdAt(profile.getCreatedAt())
                .build();
    }
}
