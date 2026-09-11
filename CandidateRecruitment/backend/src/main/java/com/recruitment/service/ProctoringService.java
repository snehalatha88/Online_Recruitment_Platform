package com.recruitment.service;

import com.recruitment.dto.request.ViolationReportRequest;
import com.recruitment.dto.response.ProctoringViolationResponse;
import com.recruitment.entity.CandidateProfile;
import com.recruitment.entity.Exam;
import com.recruitment.entity.ExamAttempt;
import com.recruitment.entity.ProctoringViolation;
import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.SubmissionReason;
import com.recruitment.entity.enums.ViolationAction;
import com.recruitment.exception.BadRequestException;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.exception.UnauthorizedAccessException;
import com.recruitment.repository.ExamAttemptRepository;
import com.recruitment.repository.ProctoringViolationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProctoringService {

    private static final Logger log = LoggerFactory.getLogger(ProctoringService.class);

    private final ProctoringViolationRepository violationRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamTakingService examTakingService;
    private final AuditLogService auditLogService;

    public ProctoringService(
            ProctoringViolationRepository violationRepository,
            ExamAttemptRepository attemptRepository,
            @Lazy ExamTakingService examTakingService,
            AuditLogService auditLogService) {
        this.violationRepository = violationRepository;
        this.attemptRepository = attemptRepository;
        this.examTakingService = examTakingService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public ProctoringViolationResponse recordViolation(Long attemptId, ViolationReportRequest request, Long candidateProfileId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        if (!attempt.getCandidate().getId().equals(candidateProfileId)) {
            throw new UnauthorizedAccessException("You cannot report violations for another candidate's attempt.");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("Exam attempt is no longer active.");
        }

        Exam exam = attempt.getExam();
        if (!exam.isProctoringEnabled()) {
            // Proctoring disabled for this exam, ignore silently
            return null;
        }

        int currentViolations = attempt.getViolationCount() + 1;
        attempt.setViolationCount(currentViolations);

        ViolationAction actionTaken = ViolationAction.WARNING;
        if (currentViolations == exam.getMaxViolations()) {
            actionTaken = ViolationAction.FINAL_WARNING;
        } else if (currentViolations > exam.getMaxViolations()) {
            actionTaken = exam.isAutoSubmitOnViolation() ? ViolationAction.AUTO_SUBMITTED : ViolationAction.FINAL_WARNING;
        }

        ProctoringViolation violation = ProctoringViolation.builder()
                .attempt(attempt)
                .candidate(attempt.getCandidate())
                .violationType(request.getViolationType())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .actionTaken(actionTaken)
                .build();

        ProctoringViolation savedViolation = violationRepository.save(violation);
        attemptRepository.save(attempt);

        log.warn("PROCTORING VIOLATION: Candidate [{}] Attempt [{}] Type [{}] Total Violations [{}] Action [{}]",
                attempt.getCandidate().getCandidateId(), attemptId, request.getViolationType(), currentViolations, actionTaken);

        auditLogService.logAction(
                attempt.getCandidate().getUser().getId(),
                attempt.getCandidate().getUser().getUsername(),
                "PROCTORING_VIOLATION",
                null, null,
                "Violation #" + currentViolations + " (" + request.getViolationType() + ") - Action: " + actionTaken
        );

        // Auto submit if threshold exceeded
        if (currentViolations > exam.getMaxViolations() && exam.isAutoSubmitOnViolation()) {
            log.info("Violation threshold exceeded for attempt {}. Triggering auto-submission.", attemptId);
            examTakingService.submitExam(attemptId, SubmissionReason.PROCTORING_VIOLATION, candidateProfileId);
        }

        return mapToResponse(savedViolation);
    }

    @Transactional(readOnly = true)
    public List<ProctoringViolationResponse> getViolationsByAttempt(Long attemptId) {
        return violationRepository.findByAttemptIdOrderByTimestampAsc(attemptId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ProctoringViolationResponse mapToResponse(ProctoringViolation violation) {
        CandidateProfile candidate = violation.getCandidate();
        return ProctoringViolationResponse.builder()
                .id(violation.getId())
                .attemptId(violation.getAttempt().getId())
                .candidateId(candidate.getId())
                .candidateFullName(candidate.getFullName())
                .candidateCode(candidate.getCandidateId())
                .violationType(violation.getViolationType())
                .timestamp(violation.getTimestamp())
                .description(violation.getDescription())
                .severity(violation.getSeverity())
                .actionTaken(violation.getActionTaken())
                .build();
    }
}
