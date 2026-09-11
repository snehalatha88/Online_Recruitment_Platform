package com.recruitment.service;

import com.recruitment.dto.request.AnswerSaveRequest;
import com.recruitment.dto.request.CodingSubmitRequest;
import com.recruitment.dto.response.*;
import com.recruitment.entity.*;
import com.recruitment.entity.enums.*;
import com.recruitment.exception.BadRequestException;
import com.recruitment.exception.ExamExpiredException;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.exception.UnauthorizedAccessException;
import com.recruitment.repository.*;
import com.recruitment.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamTakingService {

    private static final Logger log = LoggerFactory.getLogger(ExamTakingService.class);

    private final ExamRepository examRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final AnswerRepository answerRepository;
    private final CodingSubmissionRepository codingSubmissionRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CodingQuestionRepository codingQuestionRepository;
    private final EvaluationService evaluationService;
    private final AuditLogService auditLogService;

    @Transactional
    public List<CandidateExamCardResponse> getAssignedExams(Long candidateProfileId) {
        List<ExamAssignment> assignments = assignmentRepository.findByCandidateId(candidateProfileId);

        return assignments.stream()
                .map(assignment -> {
                    Exam exam = assignment.getExam();
                    if (exam.getStatus() != ExamStatus.PUBLISHED) {
                        return null; // hide unpublished exams
                    }

                    List<ExamAttempt> attempts = attemptRepository.findByCandidateIdAndExamId(candidateProfileId, exam.getId());
                    for (ExamAttempt activeAttempt : attempts) {
                        if (activeAttempt.getStatus() == AttemptStatus.IN_PROGRESS) {
                            try {
                                submitExam(activeAttempt.getId(), SubmissionReason.MANUAL, candidateProfileId);
                            } catch (Exception ignored) {}
                        }
                    }

                    ExamAssignment currentAssignment = assignmentRepository.findById(assignment.getId()).orElse(assignment);
                    int attemptCount = currentAssignment.getAttemptCount();
                    boolean canStart = (attemptCount < exam.getMaxAttempts() && currentAssignment.getStatus() != AssignmentStatus.COMPLETED);

                    List<ExamQuestion> eqList = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(exam.getId());
                    double totalMarks = eqList.stream()
                            .mapToDouble(eq -> eq.getCustomMarks() != null ? eq.getCustomMarks() : eq.getQuestion().getMarks())
                            .sum();

                    return CandidateExamCardResponse.builder()
                            .assignmentId(currentAssignment.getId())
                            .examId(exam.getId())
                            .title(exam.getTitle())
                            .description(exam.getDescription())
                            .instructions(exam.getInstructions())
                            .durationMinutes(exam.getDurationMinutes())
                            .passingPercentage(exam.getPassingPercentage())
                            .questionCount(eqList.size())
                            .totalMarks(totalMarks)
                            .proctoringEnabled(exam.isProctoringEnabled())
                            .fullScreenRequired(exam.isFullScreenRequired())
                            .maxViolations(exam.getMaxViolations())
                            .assignmentStatus(currentAssignment.getStatus())
                            .dueDate(currentAssignment.getDueDate())
                            .attemptCount(attemptCount)
                            .maxAttempts(exam.getMaxAttempts())
                            .canStart(canStart)
                            .activeAttemptId(null)
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional
    public AttemptStartResponse startExam(Long examId, Long candidateProfileId) {
        CandidateProfile candidate = candidateProfileRepository.findById(candidateProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found: " + candidateProfileId));

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (exam.getStatus() != ExamStatus.PUBLISHED) {
            throw new BadRequestException("This examination is not currently available.");
        }

        ExamAssignment assignment = assignmentRepository.findByExamIdAndCandidateId(examId, candidateProfileId)
                .orElseThrow(() -> new UnauthorizedAccessException("You have not been assigned to this examination."));

        if (assignment.getStatus() == AssignmentStatus.COMPLETED) {
            throw new BadRequestException("You have already completed this examination.");
        }

        // Check if there is already an active attempt in progress and auto-submit it if expired
        List<ExamAttempt> existingAttempts = attemptRepository.findByCandidateIdAndExamId(candidateProfileId, examId);
        Optional<ExamAttempt> activeAttemptOpt = existingAttempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS)
                .findFirst();

        ExamAttempt attempt;
        if (activeAttemptOpt.isPresent()) {
            attempt = activeAttemptOpt.get();
            if (Instant.now().isAfter(attempt.getExpectedEndTime())) {
                submitExam(attempt.getId(), SubmissionReason.TIME_EXPIRED, candidateProfileId);
                throw new ExamExpiredException("The time allotted for this examination has expired.");
            }
        } else {
            // Check max attempts limit for current assignment
            if (assignment.getAttemptCount() >= exam.getMaxAttempts()) {
                throw new BadRequestException("You have reached the maximum allowed attempts (" + exam.getMaxAttempts() + ") for this examination.");
            }

            Instant now = Instant.now();
            Instant expectedEnd = now.plus(Duration.ofMinutes(exam.getDurationMinutes()));

            attempt = ExamAttempt.builder()
                    .exam(exam)
                    .candidate(candidate)
                    .startTime(now)
                    .expectedEndTime(expectedEnd)
                    .status(AttemptStatus.IN_PROGRESS)
                    .violationCount(0)
                    .build();

            attempt = attemptRepository.save(attempt);

            assignment.setStatus(AssignmentStatus.IN_PROGRESS);
            assignment.setAttemptCount(assignment.getAttemptCount() + 1);
            assignmentRepository.save(assignment);

            auditLogService.logAction(
                    candidate.getUser().getId(),
                    candidate.getUser().getUsername(),
                    "EXAM_STARTED",
                    null, null,
                    "Started attempt #" + attempt.getId() + " for exam: " + exam.getTitle()
            );
        }

        long remainingSec = Math.max(0, Duration.between(Instant.now(), attempt.getExpectedEndTime()).getSeconds());

        List<CandidateExamQuestionResponse> questions = getSanitizedQuestions(attempt);

        double totalMarks = questions.stream().mapToDouble(CandidateExamQuestionResponse::getMarks).sum();

        return AttemptStartResponse.builder()
                .attemptId(attempt.getId())
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .instructions(exam.getInstructions())
                .startTime(attempt.getStartTime())
                .expectedEndTime(attempt.getExpectedEndTime())
                .durationMinutes(exam.getDurationMinutes())
                .remainingSeconds(remainingSec)
                .totalQuestions(questions.size())
                .totalMarks(totalMarks)
                .proctoringEnabled(exam.isProctoringEnabled())
                .fullScreenRequired(exam.isFullScreenRequired())
                .maxViolations(exam.getMaxViolations())
                .autoSubmitOnViolation(exam.isAutoSubmitOnViolation())
                .questions(questions)
                .build();
    }

    @Transactional(readOnly = true)
    public AttemptStartResponse getAttemptQuestions(Long attemptId, Long candidateProfileId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        if (!attempt.getCandidate().getId().equals(candidateProfileId)) {
            throw new UnauthorizedAccessException("You cannot access another candidate's examination attempt.");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("This examination attempt has already been submitted and completed.");
        }

        Exam exam = attempt.getExam();
        long remainingSec = Math.max(0, Duration.between(Instant.now(), attempt.getExpectedEndTime()).getSeconds());

        List<CandidateExamQuestionResponse> questions = getSanitizedQuestions(attempt);
        double totalMarks = questions.stream().mapToDouble(CandidateExamQuestionResponse::getMarks).sum();

        return AttemptStartResponse.builder()
                .attemptId(attempt.getId())
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .instructions(exam.getInstructions())
                .startTime(attempt.getStartTime())
                .expectedEndTime(attempt.getExpectedEndTime())
                .durationMinutes(exam.getDurationMinutes())
                .remainingSeconds(remainingSec)
                .totalQuestions(questions.size())
                .totalMarks(totalMarks)
                .proctoringEnabled(exam.isProctoringEnabled())
                .fullScreenRequired(exam.isFullScreenRequired())
                .maxViolations(exam.getMaxViolations())
                .autoSubmitOnViolation(exam.isAutoSubmitOnViolation())
                .questions(questions)
                .build();
    }

    @Transactional
    public void saveAnswer(Long attemptId, AnswerSaveRequest request, Long candidateProfileId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        if (!attempt.getCandidate().getId().equals(candidateProfileId)) {
            throw new UnauthorizedAccessException("You cannot modify another candidate's answers.");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("Examination attempt is already finalized.");
        }

        // Server-authoritative timer check (with 15s grace period for network jitter)
        if (Instant.now().isAfter(attempt.getExpectedEndTime().plusSeconds(15))) {
            submitExam(attemptId, SubmissionReason.TIME_EXPIRED, candidateProfileId);
            throw new ExamExpiredException("Examination time has expired. Your exam has been submitted.");
        }

        Question question = examQuestionRepository.findByExamIdAndQuestionId(attempt.getExam().getId(), request.getQuestionId())
                .map(ExamQuestion::getQuestion)
                .orElseThrow(() -> new BadRequestException("Question ID " + request.getQuestionId() + " does not belong to this exam."));

        Answer answer = answerRepository.findByAttemptIdAndQuestionId(attemptId, question.getId())
                .orElse(Answer.builder()
                        .attempt(attempt)
                        .question(question)
                        .build());

        answer.setSelectedOptionIds(request.getSelectedOptionIds());
        answer.setMarkedForReview(request.isMarkedForReview());
        answerRepository.save(answer);
    }

    @Transactional
    public void saveCodingDraft(Long attemptId, CodingSubmitRequest request, Long candidateProfileId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        if (!attempt.getCandidate().getId().equals(candidateProfileId)) {
            throw new UnauthorizedAccessException("You cannot modify another candidate's submissions.");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("Examination attempt is already finalized.");
        }

        if (Instant.now().isAfter(attempt.getExpectedEndTime().plusSeconds(15))) {
            submitExam(attemptId, SubmissionReason.TIME_EXPIRED, candidateProfileId);
            throw new ExamExpiredException("Examination time has expired. Your exam has been submitted.");
        }

        CodingQuestion cq = codingQuestionRepository.findById(request.getCodingQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Coding question not found"));

        CodingSubmission submission = codingSubmissionRepository.findByAttemptIdAndCodingQuestionId(attemptId, cq.getId())
                .orElse(CodingSubmission.builder()
                        .attempt(attempt)
                        .codingQuestion(cq)
                        .build());

        submission.setLanguage(request.getLanguage());
        submission.setSourceCode(request.getSourceCode());
        submission.setExecutionStatus(ExecutionStatus.ACCEPTED); // draft state
        codingSubmissionRepository.save(submission);
    }

    @Transactional
    public AttemptStatusResponse submitExam(Long attemptId, SubmissionReason reason, Long candidateProfileId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        if (candidateProfileId != null && !attempt.getCandidate().getId().equals(candidateProfileId) && !SecurityUtils.isAdmin()) {
            throw new UnauthorizedAccessException("You cannot submit another candidate's examination.");
        }

        // Idempotency: if already finalized, return current status cleanly
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            return AttemptStatusResponse.builder()
                    .attemptId(attempt.getId())
                    .status(attempt.getStatus())
                    .submissionReason(attempt.getSubmissionReason())
                    .startTime(attempt.getStartTime())
                    .expectedEndTime(attempt.getExpectedEndTime())
                    .submissionTime(attempt.getSubmissionTime())
                    .violationCount(attempt.getViolationCount())
                    .isExpired(true)
                    .message("Your examination has been submitted successfully. Your assessment will be reviewed by the technical recruitment team.")
                    .build();
        }

        attempt.setSubmissionTime(Instant.now());
        attempt.setSubmissionReason(reason);

        if (reason == SubmissionReason.PROCTORING_VIOLATION) {
            attempt.setStatus(AttemptStatus.AUTO_SUBMITTED);
        } else if (reason == SubmissionReason.TIME_EXPIRED) {
            attempt.setStatus(AttemptStatus.AUTO_SUBMITTED);
        } else {
            attempt.setStatus(AttemptStatus.SUBMITTED);
        }

        ExamAttempt savedAttempt = attemptRepository.saveAndFlush(attempt);

        // Mark Assignment as COMPLETED
        assignmentRepository.findByExamIdAndCandidateId(attempt.getExam().getId(), attempt.getCandidate().getId())
                .ifPresent(assignment -> {
                    assignment.setStatus(AssignmentStatus.COMPLETED);
                    assignmentRepository.save(assignment);
                });

        // Server-Side Evaluation Engine triggers immediately
        evaluationService.evaluateAttempt(savedAttempt.getId());

        auditLogService.logAction(
                attempt.getCandidate().getUser().getId(),
                attempt.getCandidate().getUser().getUsername(),
                "EXAM_SUBMITTED",
                null, null,
                "Submitted attempt #" + attemptId + " (Reason: " + reason + ")"
        );

        // Strict confidentiality: DO NOT return scores or results to the candidate!
        return AttemptStatusResponse.builder()
                .attemptId(savedAttempt.getId())
                .status(savedAttempt.getStatus())
                .submissionReason(savedAttempt.getSubmissionReason())
                .startTime(savedAttempt.getStartTime())
                .expectedEndTime(savedAttempt.getExpectedEndTime())
                .submissionTime(savedAttempt.getSubmissionTime())
                .violationCount(savedAttempt.getViolationCount())
                .isExpired(true)
                .message("Your examination has been submitted successfully. Your assessment will be reviewed by the technical recruitment team.")
                .build();
    }

    private List<CandidateExamQuestionResponse> getSanitizedQuestions(ExamAttempt attempt) {
        Exam exam = attempt.getExam();
        List<ExamQuestion> examQuestions = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(exam.getId());

        if (exam.isRandomizeQuestions()) {
            // Deterministic pseudo-random shuffle seeded by attempt ID so order remains consistent for the candidate
            Collections.shuffle(examQuestions, new Random(attempt.getId()));
        }

        List<Answer> answers = answerRepository.findByAttemptId(attempt.getId());
        Map<Long, Answer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (k1, k2) -> k1));

        List<CodingSubmission> submissions = codingSubmissionRepository.findByAttemptId(attempt.getId());
        Map<Long, CodingSubmission> submissionMap = submissions.stream()
                .collect(Collectors.toMap(s -> s.getCodingQuestion().getId(), s -> s, (k1, k2) -> k1));

        List<CandidateExamQuestionResponse> result = new ArrayList<>();
        int order = 1;

        for (ExamQuestion eq : examQuestions) {
            Question q = eq.getQuestion();
            Answer ans = answerMap.get(q.getId());

            // Sanitize options (STRIP isCorrect!)
            List<CandidateQuestionOptionResponse> candidateOptions = new ArrayList<>();
            if (q.getOptions() != null) {
                candidateOptions = q.getOptions().stream()
                        .map(opt -> CandidateQuestionOptionResponse.builder()
                                .id(opt.getId())
                                .optionText(opt.getOptionText())
                                .optionOrder(opt.getOptionOrder())
                                .build())
                        .collect(Collectors.toList());
            }

            // Sanitize coding details (STRIP hidden test cases!)
            CandidateCodingDetailsResponse candidateCoding = null;
            String currentCode = null;
            String currentLanguage = "JAVA";

            if (q.getCodingDetails() != null) {
                CodingQuestion cq = q.getCodingDetails();
                List<CandidateTestCaseResponse> sampleCases = new ArrayList<>();
                if (cq.getTestCases() != null) {
                    sampleCases = cq.getTestCases().stream()
                            .filter(tc -> !tc.isHidden()) // Public samples only!
                            .map(tc -> CandidateTestCaseResponse.builder()
                                    .id(tc.getId())
                                    .inputData(tc.getInputData())
                                    .expectedOutput(tc.getExpectedOutput())
                                    .orderIndex(tc.getOrderIndex())
                                    .build())
                            .collect(Collectors.toList());
                }

                candidateCoding = CandidateCodingDetailsResponse.builder()
                        .id(cq.getId())
                        .problemStatement(cq.getProblemStatement())
                        .inputFormat(cq.getInputFormat())
                        .outputFormat(cq.getOutputFormat())
                        .constraints(cq.getConstraints())
                        .sampleInput(cq.getSampleInput())
                        .sampleOutput(cq.getSampleOutput())
                        .allowedLanguages(cq.getAllowedLanguages())
                        .timeLimitMs(cq.getTimeLimitMs())
                        .memoryLimitMb(cq.getMemoryLimitMb())
                        .starterCodeTemplates(cq.getStarterCodeTemplates())
                        .sampleTestCases(sampleCases)
                        .build();

                CodingSubmission sub = submissionMap.get(cq.getId());
                if (sub != null) {
                    currentCode = sub.getSourceCode();
                    currentLanguage = sub.getLanguage().name();
                }
            }

            result.add(CandidateExamQuestionResponse.builder()
                    .questionId(q.getId())
                    .questionOrder(order++)
                    .title(q.getTitle())
                    .questionText(q.getQuestionText())
                    .questionType(q.getQuestionType())
                    .difficulty(q.getDifficulty())
                    .category(q.getCategory())
                    .marks(eq.getCustomMarks() != null ? eq.getCustomMarks() : q.getMarks())
                    .negativeMarks(q.getNegativeMarks())
                    .options(candidateOptions)
                    .codingDetails(candidateCoding)
                    .currentAnswer(ans != null ? ans.getSelectedOptionIds() : null)
                    .isMarkedForReview(ans != null && ans.isMarkedForReview())
                    .currentCode(currentCode)
                    .currentLanguage(currentLanguage)
                    .build());
        }

        return result;
    }

    /**
     * Automatic server-authoritative timer expiration sweeper.
     * Sweeps every 30 seconds for in-progress attempts whose expectedEndTime has elapsed.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void sweepExpiredAttempts() {
        Instant threshold = Instant.now();
        List<ExamAttempt> expiredAttempts = attemptRepository.findByStatusAndExpectedEndTimeBefore(
                AttemptStatus.IN_PROGRESS, threshold
        );

        for (ExamAttempt attempt : expiredAttempts) {
            log.info("Auto-submitting expired exam attempt #{} for candidate {}",
                    attempt.getId(), attempt.getCandidate().getCandidateId());
            try {
                submitExam(attempt.getId(), SubmissionReason.TIME_EXPIRED, null);
            } catch (Exception e) {
                log.error("Failed to auto-submit expired attempt #{}", attempt.getId(), e);
            }
        }
    }
}
