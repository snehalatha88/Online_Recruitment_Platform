package com.recruitment.service;

import com.recruitment.dto.response.CodingExecutionResult;
import com.recruitment.entity.*;
import com.recruitment.entity.enums.AssignmentStatus;
import com.recruitment.entity.enums.ExecutionStatus;
import com.recruitment.entity.enums.QuestionType;
import com.recruitment.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private static final Logger log = LoggerFactory.getLogger(EvaluationService.class);

    private final ExamAttemptRepository attemptRepository;
    private final ExamResultRepository resultRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final AnswerRepository answerRepository;
    private final CodingSubmissionRepository codingSubmissionRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final CodeExecutionService codeExecutionService;
    private final TestCaseRepository testCaseRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public ExamResult evaluateAttempt(Long attemptId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        Exam exam = attempt.getExam();
        CandidateProfile candidate = attempt.getCandidate();

        List<ExamQuestion> examQuestions = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(exam.getId());
        List<Answer> answers = answerRepository.findByAttemptId(attemptId);
        Map<Long, Answer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (k1, k2) -> k1));

        List<CodingSubmission> submissions = codingSubmissionRepository.findByAttemptId(attemptId);
        Map<Long, CodingSubmission> submissionMap = submissions.stream()
                .collect(Collectors.toMap(s -> s.getCodingQuestion().getId(), s -> s, (k1, k2) -> k1));

        double totalMaxScore = 0.0;
        double mcqScore = 0.0;
        double codingScore = 0.0;
        int correctCount = 0;
        int wrongCount = 0;
        int unansweredCount = 0;

        for (ExamQuestion eq : examQuestions) {
            Question q = eq.getQuestion();
            double questionMarks = eq.getCustomMarks() != null ? eq.getCustomMarks() : q.getMarks();
            totalMaxScore += questionMarks;

            if (q.getQuestionType() == QuestionType.MCQ) {
                Answer ans = answerMap.get(q.getId());
                if (ans == null || !StringUtils.hasText(ans.getSelectedOptionIds())) {
                    unansweredCount++;
                } else {
                    String selectedId = ans.getSelectedOptionIds().trim();
                    Optional<QuestionOption> correctOpt = q.getOptions().stream()
                            .filter(QuestionOption::isCorrect)
                            .findFirst();

                    if (correctOpt.isPresent() && String.valueOf(correctOpt.get().getId()).equals(selectedId)) {
                        mcqScore += questionMarks;
                        correctCount++;
                    } else {
                        wrongCount++;
                        if (exam.isNegativeMarkingEnabled()) {
                            double deduction = q.getNegativeMarks() > 0 ? q.getNegativeMarks() : exam.getNegativeMarksPerWrong();
                            mcqScore -= deduction;
                        }
                    }
                }
            } else if (q.getQuestionType() == QuestionType.MULTIPLE_ANSWER) {
                Answer ans = answerMap.get(q.getId());
                if (ans == null || !StringUtils.hasText(ans.getSelectedOptionIds())) {
                    unansweredCount++;
                } else {
                    Set<String> selectedSet = Arrays.stream(ans.getSelectedOptionIds().split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .collect(Collectors.toSet());

                    Set<String> correctSet = q.getOptions().stream()
                            .filter(QuestionOption::isCorrect)
                            .map(o -> String.valueOf(o.getId()))
                            .collect(Collectors.toSet());

                    if (selectedSet.equals(correctSet)) {
                        mcqScore += questionMarks;
                        correctCount++;
                    } else {
                        wrongCount++;
                        if (exam.isNegativeMarkingEnabled()) {
                            double deduction = q.getNegativeMarks() > 0 ? q.getNegativeMarks() : exam.getNegativeMarksPerWrong();
                            mcqScore -= deduction;
                        }
                    }
                }
            } else if (q.getQuestionType() == QuestionType.CODING && q.getCodingDetails() != null) {
                CodingQuestion cq = q.getCodingDetails();
                CodingSubmission submission = submissionMap.get(cq.getId());

                if (submission == null || !StringUtils.hasText(submission.getSourceCode())) {
                    unansweredCount++;
                } else {
                    // Evaluate against ALL test cases (both public and hidden)
                    List<TestCase> allTestCases = testCaseRepository.findByCodingQuestionIdOrderByOrderIndexAsc(cq.getId());
                    CodingExecutionResult result = codeExecutionService.execute(
                            submission.getLanguage(),
                            submission.getSourceCode(),
                            allTestCases,
                            cq.getTimeLimitMs()
                    );

                    submission.setExecutionStatus(result.getExecutionStatus());
                    submission.setTestCasesPassed(result.getTestCasesPassed());
                    submission.setTotalTestCases(result.getTotalTestCases());
                    submission.setExecutionTimeMs(result.getExecutionTimeMs());
                    submission.setMemoryUsedKb(result.getMemoryUsedKb());
                    submission.setCompilerOutput(StringUtils.hasText(result.getCompileErrors()) ? result.getCompileErrors() : result.getStderr());

                    double questionEarned = 0.0;
                    if (result.getTotalTestCases() > 0) {
                        double fraction = (double) result.getTestCasesPassed() / result.getTotalTestCases();
                        questionEarned = fraction * questionMarks;
                    }

                    submission.setScoreAwarded(questionEarned);
                    codingSubmissionRepository.save(submission);

                    codingScore += questionEarned;
                    if (result.isPassed()) {
                        correctCount++;
                    } else if (result.getTestCasesPassed() > 0) {
                        correctCount++; // partial
                    } else {
                        wrongCount++;
                    }
                }
            }
        }

        mcqScore = Math.max(0.0, mcqScore);
        double totalScore = Math.max(0.0, mcqScore + codingScore);
        double percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100.0 : 0.0;
        // Round to 2 decimal places
        percentage = Math.round(percentage * 100.0) / 100.0;
        boolean isPassed = percentage >= exam.getPassingPercentage();

        ExamResult examResult = resultRepository.findByAttemptId(attemptId)
                .orElse(ExamResult.builder()
                        .attempt(attempt)
                        .exam(exam)
                        .candidate(candidate)
                        .build());

        examResult.setTotalScore(totalScore);
        examResult.setMaxScore(totalMaxScore);
        examResult.setPercentage(percentage);
        examResult.setPassed(isPassed);
        examResult.setMcqScore(mcqScore);
        examResult.setCodingScore(codingScore);
        examResult.setTotalQuestions(examQuestions.size());
        examResult.setCorrectAnswersCount(correctCount);
        examResult.setWrongAnswersCount(wrongCount);
        examResult.setUnansweredCount(unansweredCount);
        examResult.setEvaluatedAt(Instant.now());

        ExamResult savedResult = resultRepository.save(examResult);

        // Update exam assignment status
        assignmentRepository.findByExamIdAndCandidateId(exam.getId(), candidate.getId())
                .ifPresent(assignment -> {
                    assignment.setStatus(AssignmentStatus.COMPLETED);
                    assignmentRepository.save(assignment);
                });

        auditLogService.logAction(
                candidate.getUser().getId(),
                candidate.getUser().getUsername(),
                "EXAM_EVALUATED",
                null, null,
                "Evaluated attempt #" + attemptId + " - Score: " + totalScore + "/" + totalMaxScore + " (" + percentage + "% - " + (isPassed ? "PASSED" : "FAILED") + ")"
        );

        log.info("Evaluation complete for attempt {}: Score={}/{} ({}%), Passed={}",
                attemptId, totalScore, totalMaxScore, percentage, isPassed);

        return savedResult;
    }
}
