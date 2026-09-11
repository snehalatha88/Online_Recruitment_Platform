package com.recruitment.service;

import com.recruitment.dto.request.ExamAssignRequest;
import com.recruitment.dto.response.ExamAssignmentResponse;
import com.recruitment.entity.CandidateProfile;
import com.recruitment.entity.Exam;
import com.recruitment.entity.ExamAssignment;
import com.recruitment.entity.ExamAttempt;
import com.recruitment.entity.User;
import com.recruitment.entity.enums.AssignmentStatus;
import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.SubmissionReason;
import com.recruitment.exception.BadRequestException;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.CandidateProfileRepository;
import com.recruitment.repository.ExamAssignmentRepository;
import com.recruitment.repository.ExamAttemptRepository;
import com.recruitment.repository.ExamRepository;
import com.recruitment.repository.UserRepository;
import com.recruitment.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final ExamAssignmentRepository assignmentRepository;
    private final ExamRepository examRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final UserRepository userRepository;
    private final ExamAttemptRepository attemptRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public int assignExam(ExamAssignRequest request) {
        Exam exam = examRepository.findById(request.getExamId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + request.getExamId()));

        User assigner = userRepository.findById(SecurityUtils.getCurrentUserId()).orElse(null);

        Set<CandidateProfile> targetCandidates = new HashSet<>();

        if (request.getCandidateIds() != null && !request.getCandidateIds().isEmpty()) {
            List<CandidateProfile> candidates = candidateProfileRepository.findAllById(request.getCandidateIds());
            targetCandidates.addAll(candidates);
        }

        if (StringUtils.hasText(request.getDepartment())) {
            List<CandidateProfile> deptCandidates = candidateProfileRepository.findAll().stream()
                    .filter(c -> request.getDepartment().equalsIgnoreCase(c.getDepartment()))
                    .toList();
            targetCandidates.addAll(deptCandidates);
        }

        if (targetCandidates.isEmpty()) {
            throw new BadRequestException("No valid candidates found for assignment.");
        }

        int count = 0;
        for (CandidateProfile candidate : targetCandidates) {
            ExamAssignment assignment = assignmentRepository.findByExamIdAndCandidateId(exam.getId(), candidate.getId())
                    .orElse(null);

            if (assignment == null) {
                assignment = ExamAssignment.builder()
                        .exam(exam)
                        .candidate(candidate)
                        .assignedBy(assigner)
                        .dueDate(request.getDueDate())
                        .status(AssignmentStatus.ASSIGNED)
                        .attemptCount(0)
                        .build();
            } else {
                assignment.setDueDate(request.getDueDate());
                assignment.setAssignedBy(assigner);
                assignment.setStatus(AssignmentStatus.ASSIGNED);
                assignment.setAttemptCount(0);
            }
            assignmentRepository.save(assignment);

            // Clean up any lingering in-progress attempts so the candidate gets a fresh start
            List<ExamAttempt> staleAttempts = attemptRepository.findByCandidateIdAndExamId(candidate.getId(), exam.getId());
            for (ExamAttempt oldAttempt : staleAttempts) {
                if (oldAttempt.getStatus() == AttemptStatus.IN_PROGRESS) {
                    oldAttempt.setStatus(AttemptStatus.AUTO_SUBMITTED);
                    oldAttempt.setSubmissionReason(SubmissionReason.ADMIN_TERMINATED);
                    oldAttempt.setSubmissionTime(Instant.now());
                    attemptRepository.save(oldAttempt);
                }
            }

            count++;
        }

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "EXAM_ASSIGNED",
                null, null,
                "Assigned exam '" + exam.getTitle() + "' to " + count + " candidate(s)"
        );

        return count;
    }

    @Transactional
    public ExamAssignmentResponse reassignExam(Long assignmentId, Instant newDueDate) {
        ExamAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id: " + assignmentId));

        User assigner = userRepository.findById(SecurityUtils.getCurrentUserId()).orElse(null);

        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment.setAttemptCount(0);
        if (newDueDate != null) {
            assignment.setDueDate(newDueDate);
        }
        if (assigner != null) {
            assignment.setAssignedBy(assigner);
        }
        ExamAssignment saved = assignmentRepository.save(assignment);

        // Terminate any stale in-progress attempts
        List<ExamAttempt> staleAttempts = attemptRepository.findByCandidateIdAndExamId(assignment.getCandidate().getId(), assignment.getExam().getId());
        for (ExamAttempt oldAttempt : staleAttempts) {
            if (oldAttempt.getStatus() == AttemptStatus.IN_PROGRESS) {
                oldAttempt.setStatus(AttemptStatus.AUTO_SUBMITTED);
                oldAttempt.setSubmissionReason(SubmissionReason.ADMIN_TERMINATED);
                oldAttempt.setSubmissionTime(Instant.now());
                attemptRepository.save(oldAttempt);
            }
        }

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "EXAM_REASSIGNED",
                null, null,
                "Reassigned exam '" + assignment.getExam().getTitle() + "' to candidate " + assignment.getCandidate().getFullName()
        );

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<ExamAssignmentResponse> searchAssignments(Long examId, Long candidateId, AssignmentStatus status, Pageable pageable) {
        return assignmentRepository.searchAssignments(examId, candidateId, status, pageable)
                .map(this::mapToResponse);
    }

    private ExamAssignmentResponse mapToResponse(ExamAssignment a) {
        return ExamAssignmentResponse.builder()
                .id(a.getId())
                .examId(a.getExam() != null ? a.getExam().getId() : null)
                .examTitle(a.getExam() != null ? a.getExam().getTitle() : null)
                .examDescription(a.getExam() != null ? a.getExam().getDescription() : null)
                .durationMinutes(a.getExam() != null ? a.getExam().getDurationMinutes() : null)
                .passingPercentage(a.getExam() != null ? a.getExam().getPassingPercentage() : null)
                .candidateId(a.getCandidate() != null ? a.getCandidate().getId() : null)
                .candidateFullName(a.getCandidate() != null ? a.getCandidate().getFullName() : null)
                .candidateCode(a.getCandidate() != null ? a.getCandidate().getCandidateId() : null)
                .candidateEmail(a.getCandidate() != null && a.getCandidate().getUser() != null ? a.getCandidate().getUser().getEmail() : null)
                .candidateDepartment(a.getCandidate() != null ? a.getCandidate().getDepartment() : null)
                .assignedByUsername(a.getAssignedBy() != null ? a.getAssignedBy().getUsername() : null)
                .assignedAt(a.getAssignedAt())
                .dueDate(a.getDueDate())
                .status(a.getStatus())
                .attemptCount(a.getAttemptCount())
                .maxAttempts(a.getExam() != null ? a.getExam().getMaxAttempts() : 1)
                .build();
    }

    @Transactional
    public void deleteAssignment(Long id) {
        ExamAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id: " + id));

        assignmentRepository.delete(assignment);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "ASSIGNMENT_DELETED",
                null, null,
                "Deleted assignment ID: " + id
        );
    }
}
