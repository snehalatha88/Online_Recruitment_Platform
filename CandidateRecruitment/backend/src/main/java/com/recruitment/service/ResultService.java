package com.recruitment.service;

import com.recruitment.dto.response.*;
import com.recruitment.entity.*;
import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.ExamStatus;
import com.recruitment.entity.enums.UserStatus;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final ExamResultRepository resultRepository;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final AnswerRepository answerRepository;
    private final CodingSubmissionRepository codingSubmissionRepository;
    private final ProctoringViolationRepository violationRepository;
    private final ProctoringService proctoringService;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        long totalCandidates = userRepository.count() - 1; // excluding superadmin
        long activeCandidates = userRepository.countByStatus(UserStatus.ACTIVE);
        long totalExams = examRepository.count();
        long publishedExams = examRepository.countByStatus(ExamStatus.PUBLISHED);
        long totalAttempts = attemptRepository.count();
        long completedAttempts = resultRepository.count();
        long inProgressAttempts = attemptRepository.countByStatus(AttemptStatus.IN_PROGRESS);
        long totalViolations = violationRepository.count();

        Double avgPercentage = resultRepository.calculateOverallAveragePercentage();
        double averageScore = avgPercentage != null ? Math.round(avgPercentage * 100.0) / 100.0 : 0.0;

        long passedCount = resultRepository.countPassedResults();
        double passRate = completedAttempts > 0 ? Math.round(((double) passedCount / completedAttempts) * 10000.0) / 100.0 : 0.0;

        // Recent 5 results
        Page<ExamResult> recentPage = resultRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "evaluatedAt"))
        );
        List<ExamResultResponse> recentResults = recentPage.getContent().stream()
                .map(this::mapToResultResponse)
                .collect(Collectors.toList());

        // Exam performance breakdown
        List<Exam> exams = examRepository.findAll();
        List<DashboardStatsResponse.ExamPerformanceStat> examStats = new ArrayList<>();

        for (Exam exam : exams) {
            List<ExamResult> results = resultRepository.findAll().stream()
                    .filter(r -> r.getExam().getId().equals(exam.getId()))
                    .toList();

            if (!results.isEmpty()) {
                int examAttempts = results.size();
                int examPassed = (int) results.stream().filter(ExamResult::isPassed).count();
                double examAvg = results.stream().mapToDouble(ExamResult::getPercentage).average().orElse(0.0);

                examStats.add(DashboardStatsResponse.ExamPerformanceStat.builder()
                        .examId(exam.getId())
                        .examTitle(exam.getTitle())
                        .totalAttempts(examAttempts)
                        .passedCount(examPassed)
                        .averagePercentage(Math.round(examAvg * 100.0) / 100.0)
                        .build());
            }
        }

        return DashboardStatsResponse.builder()
                .totalCandidates(Math.max(0, totalCandidates))
                .activeCandidates(activeCandidates)
                .totalExams(totalExams)
                .publishedExams(publishedExams)
                .totalAttempts(totalAttempts)
                .completedAttempts(completedAttempts)
                .inProgressAttempts(inProgressAttempts)
                .averageScore(averageScore)
                .passRate(passRate)
                .totalViolations(totalViolations)
                .recentResults(recentResults)
                .examStats(examStats)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<ExamResultResponse> searchResults(Long examId, Long candidateId, Boolean isPassed, String query, Pageable pageable) {
        String searchQuery = StringUtils.hasText(query) ? query.trim() : null;
        return resultRepository.searchResults(examId, candidateId, isPassed, searchQuery, pageable)
                .map(this::mapToResultResponse);
    }

    @Transactional(readOnly = true)
    public AttemptDetailResponse getAttemptDetail(Long attemptId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        Exam exam = attempt.getExam();
        CandidateProfile candidate = attempt.getCandidate();
        ExamResult result = resultRepository.findByAttemptId(attemptId).orElse(null);

        List<ExamQuestion> examQuestions = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(exam.getId());
        List<Answer> answers = answerRepository.findByAttemptId(attemptId);
        Map<Long, Answer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (k1, k2) -> k1));

        List<CodingSubmission> submissions = codingSubmissionRepository.findByAttemptId(attemptId);
        List<CodingSubmissionResponse> codingSubmissionResponses = submissions.stream()
                .map(s -> CodingSubmissionResponse.builder()
                        .id(s.getId())
                        .attemptId(s.getAttempt().getId())
                        .codingQuestionId(s.getCodingQuestion().getId())
                        .language(s.getLanguage())
                        .sourceCode(s.getSourceCode())
                        .executionStatus(s.getExecutionStatus())
                        .testCasesPassed(s.getTestCasesPassed())
                        .totalTestCases(s.getTotalTestCases())
                        .scoreAwarded(s.getScoreAwarded())
                        .executionTimeMs(s.getExecutionTimeMs())
                        .memoryUsedKb(s.getMemoryUsedKb())
                        .compilerOutput(s.getCompilerOutput())
                        .submittedAt(s.getSubmittedAt())
                        .build())
                .collect(Collectors.toList());

        List<AttemptDetailResponse.QuestionReviewItem> questionReviews = new ArrayList<>();
        int order = 1;

        for (ExamQuestion eq : examQuestions) {
            Question q = eq.getQuestion();
            Answer ans = answerMap.get(q.getId());
            double maxMarks = eq.getCustomMarks() != null ? eq.getCustomMarks() : q.getMarks();
            double awardedMarks = 0.0;
            boolean isCorrect = false;
            boolean isAnswered = ans != null && StringUtils.hasText(ans.getSelectedOptionIds());
            String candidateAnswerText = "-";
            String correctAnswerText = "-";

            List<QuestionOptionResponse> options = new ArrayList<>();
            if (q.getOptions() != null) {
                options = q.getOptions().stream()
                        .map(opt -> QuestionOptionResponse.builder()
                                .id(opt.getId())
                                .optionText(opt.getOptionText())
                                .isCorrect(opt.isCorrect())
                                .optionOrder(opt.getOptionOrder())
                                .build())
                        .collect(Collectors.toList());

                // Build correct answer text
                correctAnswerText = q.getOptions().stream()
                        .filter(QuestionOption::isCorrect)
                        .map(QuestionOption::getOptionText)
                        .collect(Collectors.joining(", "));

                // Build candidate answer text
                if (isAnswered) {
                    Set<String> selectedIds = Arrays.stream(ans.getSelectedOptionIds().split(","))
                            .map(String::trim)
                            .collect(Collectors.toSet());

                    candidateAnswerText = q.getOptions().stream()
                            .filter(opt -> selectedIds.contains(String.valueOf(opt.getId())))
                            .map(QuestionOption::getOptionText)
                            .collect(Collectors.joining(", "));

                    Set<String> correctIds = q.getOptions().stream()
                            .filter(QuestionOption::isCorrect)
                            .map(opt -> String.valueOf(opt.getId()))
                            .collect(Collectors.toSet());

                    if (selectedIds.equals(correctIds)) {
                        isCorrect = true;
                        awardedMarks = maxMarks;
                    } else if (exam.isNegativeMarkingEnabled()) {
                        awardedMarks = -(q.getNegativeMarks() > 0 ? q.getNegativeMarks() : exam.getNegativeMarksPerWrong());
                    }
                }
            }

            questionReviews.add(AttemptDetailResponse.QuestionReviewItem.builder()
                    .questionId(q.getId())
                    .order(order++)
                    .title(q.getTitle())
                    .questionText(q.getQuestionText())
                    .questionType(q.getQuestionType())
                    .maxMarks(maxMarks)
                    .marksAwarded(awardedMarks)
                    .candidateAnswerIds(ans != null ? ans.getSelectedOptionIds() : null)
                    .candidateAnswerText(candidateAnswerText)
                    .correctAnswerText(correctAnswerText)
                    .isCorrect(isCorrect)
                    .isAnswered(isAnswered)
                    .explanation(q.getExplanation())
                    .options(options)
                    .build());
        }

        List<ProctoringViolationResponse> violations = proctoringService.getViolationsByAttempt(attemptId);

        return AttemptDetailResponse.builder()
                .candidateId(candidate.getId())
                .candidateFullName(candidate.getFullName())
                .candidateCode(candidate.getCandidateId())
                .candidateEmail(candidate.getUser().getEmail())
                .candidatePhone(candidate.getPhone())
                .department(candidate.getDepartment())
                .designation(candidate.getDesignation())
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .durationMinutes(exam.getDurationMinutes())
                .passingPercentage(exam.getPassingPercentage())
                .attemptId(attempt.getId())
                .status(attempt.getStatus())
                .submissionReason(attempt.getSubmissionReason())
                .startTime(attempt.getStartTime())
                .submissionTime(attempt.getSubmissionTime())
                .violationCount(attempt.getViolationCount())
                .totalScore(result != null ? result.getTotalScore() : null)
                .maxScore(result != null ? result.getMaxScore() : null)
                .percentage(result != null ? result.getPercentage() : null)
                .isPassed(result != null ? result.isPassed() : null)
                .mcqScore(result != null ? result.getMcqScore() : null)
                .codingScore(result != null ? result.getCodingScore() : null)
                .totalQuestions(result != null ? result.getTotalQuestions() : null)
                .correctAnswersCount(result != null ? result.getCorrectAnswersCount() : null)
                .wrongAnswersCount(result != null ? result.getWrongAnswersCount() : null)
                .unansweredCount(result != null ? result.getUnansweredCount() : null)
                .questionReviews(questionReviews)
                .codingSubmissions(codingSubmissionResponses)
                .violations(violations)
                .build();
    }

    public ExamResultResponse mapToResultResponse(ExamResult result) {
        CandidateProfile candidate = result.getCandidate();
        Exam exam = result.getExam();
        ExamAttempt attempt = result.getAttempt();

        return ExamResultResponse.builder()
                .id(result.getId())
                .attemptId(attempt.getId())
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .candidateId(candidate.getId())
                .candidateFullName(candidate.getFullName())
                .candidateCode(candidate.getCandidateId())
                .candidateEmail(candidate.getUser().getEmail())
                .department(candidate.getDepartment())
                .totalScore(result.getTotalScore())
                .maxScore(result.getMaxScore())
                .percentage(result.getPercentage())
                .isPassed(result.isPassed())
                .mcqScore(result.getMcqScore())
                .codingScore(result.getCodingScore())
                .totalQuestions(result.getTotalQuestions())
                .correctAnswersCount(result.getCorrectAnswersCount())
                .wrongAnswersCount(result.getWrongAnswersCount())
                .unansweredCount(result.getUnansweredCount())
                .startTime(attempt.getStartTime())
                .submissionTime(attempt.getSubmissionTime())
                .submissionReason(attempt.getSubmissionReason())
                .violationCount(attempt.getViolationCount())
                .evaluatedAt(result.getEvaluatedAt())
                .build();
    }
}
