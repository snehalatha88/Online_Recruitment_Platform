package com.recruitment;

import com.recruitment.entity.*;
import com.recruitment.entity.enums.*;
import com.recruitment.repository.*;
import com.recruitment.service.AuditLogService;
import com.recruitment.service.CodeExecutionService;
import com.recruitment.service.EvaluationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EvaluationServiceTest {

    @Mock
    private ExamAttemptRepository attemptRepository;
    @Mock
    private ExamResultRepository resultRepository;
    @Mock
    private ExamQuestionRepository examQuestionRepository;
    @Mock
    private AnswerRepository answerRepository;
    @Mock
    private CodingSubmissionRepository codingSubmissionRepository;
    @Mock
    private ExamAssignmentRepository assignmentRepository;
    @Mock
    private CodeExecutionService codeExecutionService;
    @Mock
    private TestCaseRepository testCaseRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private EvaluationService evaluationService;

    private Exam exam;
    private CandidateProfile candidate;
    private ExamAttempt attempt;
    private Question mcqQuestion;
    private Question multiQuestion;

    @BeforeEach
    void setUp() {
        Role candidateRole = Role.builder().id(2L).name(RoleName.ROLE_CANDIDATE).build();
        User user = User.builder().id(2L).username("candidate1").email("cand@test.com").role(candidateRole).build();
        candidate = CandidateProfile.builder().id(1L).user(user).candidateId("CAND-001").fullName("Candidate One").build();

        exam = Exam.builder()
                .id(1L)
                .title("Test Exam")
                .passingPercentage(50.0)
                .negativeMarkingEnabled(true)
                .negativeMarksPerWrong(0.5)
                .build();

        attempt = ExamAttempt.builder()
                .id(100L)
                .exam(exam)
                .candidate(candidate)
                .startTime(Instant.now().minusSeconds(1000))
                .expectedEndTime(Instant.now().plusSeconds(2000))
                .status(AttemptStatus.SUBMITTED)
                .build();

        // MCQ Question (ID: 10)
        mcqQuestion = Question.builder()
                .id(10L)
                .questionType(QuestionType.MCQ)
                .marks(2.0)
                .negativeMarks(0.5)
                .build();
        QuestionOption opt1 = QuestionOption.builder().id(101L).question(mcqQuestion).isCorrect(false).build();
        QuestionOption opt2 = QuestionOption.builder().id(102L).question(mcqQuestion).isCorrect(true).build();
        mcqQuestion.setOptions(Arrays.asList(opt1, opt2));

        // Multi Answer Question (ID: 20)
        multiQuestion = Question.builder()
                .id(20L)
                .questionType(QuestionType.MULTIPLE_ANSWER)
                .marks(3.0)
                .negativeMarks(0.5)
                .build();
        QuestionOption mOpt1 = QuestionOption.builder().id(201L).question(multiQuestion).isCorrect(true).build();
        QuestionOption mOpt2 = QuestionOption.builder().id(202L).question(multiQuestion).isCorrect(true).build();
        QuestionOption mOpt3 = QuestionOption.builder().id(203L).question(multiQuestion).isCorrect(false).build();
        multiQuestion.setOptions(Arrays.asList(mOpt1, mOpt2, mOpt3));
    }

    @Test
    void testEvaluateAttempt_AllCorrect() {
        ExamQuestion eq1 = ExamQuestion.builder().exam(exam).question(mcqQuestion).questionOrder(1).customMarks(2.0).build();
        ExamQuestion eq2 = ExamQuestion.builder().exam(exam).question(multiQuestion).questionOrder(2).customMarks(3.0).build();

        when(attemptRepository.findById(100L)).thenReturn(Optional.of(attempt));
        when(examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(1L)).thenReturn(Arrays.asList(eq1, eq2));

        // Candidate answers
        Answer ans1 = Answer.builder().question(mcqQuestion).selectedOptionIds("102").build(); // Correct
        Answer ans2 = Answer.builder().question(multiQuestion).selectedOptionIds("201, 202").build(); // Correct

        when(answerRepository.findByAttemptId(100L)).thenReturn(Arrays.asList(ans1, ans2));
        when(codingSubmissionRepository.findByAttemptId(100L)).thenReturn(Collections.emptyList());
        when(resultRepository.findByAttemptId(100L)).thenReturn(Optional.empty());
        when(resultRepository.save(any(ExamResult.class))).thenAnswer(i -> i.getArgument(0));

        ExamResult result = evaluationService.evaluateAttempt(100L);

        assertNotNull(result);
        assertEquals(5.0, result.getTotalScore());
        assertEquals(5.0, result.getMaxScore());
        assertEquals(100.0, result.getPercentage());
        assertTrue(result.isPassed());
        assertEquals(2, result.getCorrectAnswersCount());
        assertEquals(0, result.getWrongAnswersCount());
    }

    @Test
    void testEvaluateAttempt_WithNegativeMarking() {
        ExamQuestion eq1 = ExamQuestion.builder().exam(exam).question(mcqQuestion).questionOrder(1).customMarks(2.0).build();

        when(attemptRepository.findById(100L)).thenReturn(Optional.of(attempt));
        when(examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(1L)).thenReturn(List.of(eq1));

        // Candidate selected wrong option
        Answer ans1 = Answer.builder().question(mcqQuestion).selectedOptionIds("101").build(); // Wrong

        when(answerRepository.findByAttemptId(100L)).thenReturn(List.of(ans1));
        when(codingSubmissionRepository.findByAttemptId(100L)).thenReturn(Collections.emptyList());
        when(resultRepository.findByAttemptId(100L)).thenReturn(Optional.empty());
        when(resultRepository.save(any(ExamResult.class))).thenAnswer(i -> i.getArgument(0));

        ExamResult result = evaluationService.evaluateAttempt(100L);

        assertNotNull(result);
        assertEquals(0.0, result.getTotalScore()); // clamped at 0 min
        assertFalse(result.isPassed());
        assertEquals(1, result.getWrongAnswersCount());
    }
}
