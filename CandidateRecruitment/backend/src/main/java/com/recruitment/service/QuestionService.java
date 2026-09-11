package com.recruitment.service;

import com.recruitment.dto.request.CodingDetailsRequest;
import com.recruitment.dto.request.QuestionCreateRequest;
import com.recruitment.dto.request.QuestionOptionRequest;
import com.recruitment.dto.request.TestCaseRequest;
import com.recruitment.dto.response.*;
import com.recruitment.entity.CodingQuestion;
import com.recruitment.entity.Question;
import com.recruitment.entity.QuestionOption;
import com.recruitment.entity.TestCase;
import com.recruitment.entity.enums.DifficultyLevel;
import com.recruitment.entity.enums.QuestionType;
import com.recruitment.exception.BadRequestException;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.CodingQuestionRepository;
import com.recruitment.repository.QuestionOptionRepository;
import com.recruitment.repository.QuestionRepository;
import com.recruitment.repository.TestCaseRepository;
import com.recruitment.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final CodingQuestionRepository codingQuestionRepository;
    private final TestCaseRepository testCaseRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public QuestionResponse createQuestion(QuestionCreateRequest request) {
        validateQuestionRequest(request);

        Question question = Question.builder()
                .title(request.getTitle().trim())
                .questionText(request.getQuestionText().trim())
                .questionType(request.getQuestionType())
                .difficulty(request.getDifficulty() != null ? request.getDifficulty() : DifficultyLevel.MEDIUM)
                .category(request.getCategory().trim())
                .marks(request.getMarks())
                .negativeMarks(request.getNegativeMarks())
                .explanation(request.getExplanation())
                .build();

        Question savedQuestion = questionRepository.save(question);

        if (request.getQuestionType() == QuestionType.MCQ || request.getQuestionType() == QuestionType.MULTIPLE_ANSWER) {
            saveOptions(savedQuestion, request.getOptions());
        } else if (request.getQuestionType() == QuestionType.CODING) {
            updateOrSaveCodingDetails(savedQuestion, request.getCodingDetails());
        }

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "QUESTION_CREATED",
                null, null,
                "Created question: " + savedQuestion.getTitle() + " (" + savedQuestion.getQuestionType() + ")"
        );

        return getQuestionById(savedQuestion.getId());
    }

    @Transactional
    public QuestionResponse updateQuestion(Long id, QuestionCreateRequest request) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with id: " + id));

        validateQuestionRequest(request);

        question.setTitle(request.getTitle().trim());
        question.setQuestionText(request.getQuestionText().trim());
        question.setQuestionType(request.getQuestionType());
        question.setDifficulty(request.getDifficulty() != null ? request.getDifficulty() : DifficultyLevel.MEDIUM);
        question.setCategory(request.getCategory().trim());
        question.setMarks(request.getMarks());
        question.setNegativeMarks(request.getNegativeMarks());
        question.setExplanation(request.getExplanation());

        if (request.getQuestionType() == QuestionType.MCQ || request.getQuestionType() == QuestionType.MULTIPLE_ANSWER) {
            if (question.getCodingDetails() != null) {
                question.setCodingDetails(null);
            }
            if (question.getOptions() == null) {
                question.setOptions(new ArrayList<>());
            } else {
                question.getOptions().clear();
            }
            saveOptions(question, request.getOptions());
        } else if (request.getQuestionType() == QuestionType.CODING) {
            if (question.getOptions() != null) {
                question.getOptions().clear();
            }
            updateOrSaveCodingDetails(question, request.getCodingDetails());
        }

        Question savedQuestion = questionRepository.save(question);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "QUESTION_UPDATED",
                null, null,
                "Updated question: " + savedQuestion.getTitle()
        );

        return getQuestionById(savedQuestion.getId());
    }

    @Transactional(readOnly = true)
    public QuestionResponse getQuestionById(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with id: " + id));

        return mapToAdminResponse(question);
    }

    @Transactional(readOnly = true)
    public Page<QuestionResponse> searchQuestions(String query, QuestionType type, DifficultyLevel difficulty, String category, Pageable pageable) {
        String searchQuery = StringUtils.hasText(query) ? query.trim() : null;
        String searchCategory = StringUtils.hasText(category) ? category.trim() : null;

        return questionRepository.searchQuestions(searchQuery, type, difficulty, searchCategory, pageable)
                .map(this::mapToAdminResponse);
    }

    @Transactional
    public void deleteQuestion(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with id: " + id));

        String title = question.getTitle();
        questionRepository.delete(question);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "QUESTION_DELETED",
                null, null,
                "Deleted question: " + title + " (ID: " + id + ")"
        );
    }

    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return questionRepository.findAllDistinctCategories();
    }

    private void validateQuestionRequest(QuestionCreateRequest request) {
        if (request.getQuestionType() == QuestionType.MCQ) {
            List<QuestionOptionRequest> validOptions = request.getOptions() != null
                    ? request.getOptions().stream().filter(o -> StringUtils.hasText(o.getOptionText())).toList()
                    : List.of();

            if (validOptions.size() < 2) {
                throw new BadRequestException("MCQ question requires at least 2 options with non-empty text.");
            }
            long correctCount = validOptions.stream().filter(QuestionOptionRequest::isCorrect).count();
            if (correctCount != 1) {
                throw new BadRequestException("MCQ question must have exactly 1 correct answer. Found: " + correctCount);
            }
        } else if (request.getQuestionType() == QuestionType.MULTIPLE_ANSWER) {
            List<QuestionOptionRequest> validOptions = request.getOptions() != null
                    ? request.getOptions().stream().filter(o -> StringUtils.hasText(o.getOptionText())).toList()
                    : List.of();

            if (validOptions.size() < 2) {
                throw new BadRequestException("Multiple-answer question requires at least 2 options with non-empty text.");
            }
            long correctCount = validOptions.stream().filter(QuestionOptionRequest::isCorrect).count();
            if (correctCount < 1) {
                throw new BadRequestException("Multiple-answer question must have at least 1 correct answer.");
            }
        } else if (request.getQuestionType() == QuestionType.CODING) {
            if (request.getCodingDetails() == null) {
                request.setCodingDetails(CodingDetailsRequest.builder().build());
            }
            if (!StringUtils.hasText(request.getCodingDetails().getProblemStatement())) {
                request.getCodingDetails().setProblemStatement(request.getQuestionText());
            }
            List<TestCaseRequest> validTestCases = request.getCodingDetails().getTestCases() != null
                    ? request.getCodingDetails().getTestCases().stream().filter(tc -> StringUtils.hasText(tc.getExpectedOutput())).toList()
                    : List.of();

            if (validTestCases.isEmpty()) {
                throw new BadRequestException("Coding question must include at least one test case with expected output.");
            }
        }
    }

    private void saveOptions(Question question, List<QuestionOptionRequest> optionRequests) {
        if (optionRequests == null) return;
        int order = 1;
        for (QuestionOptionRequest optReq : optionRequests) {
            if (!StringUtils.hasText(optReq.getOptionText())) continue;
            QuestionOption option = QuestionOption.builder()
                    .question(question)
                    .optionText(optReq.getOptionText().trim())
                    .isCorrect(optReq.isCorrect())
                    .optionOrder(optReq.getOptionOrder() > 0 ? optReq.getOptionOrder() : order++)
                    .build();
            if (question.getOptions() == null) {
                question.setOptions(new ArrayList<>());
            }
            question.getOptions().add(option);
            optionRepository.save(option);
        }
    }

    private void updateOrSaveCodingDetails(Question question, CodingDetailsRequest codingReq) {
        if (codingReq == null) return;

        String problemStatement = StringUtils.hasText(codingReq.getProblemStatement())
                ? codingReq.getProblemStatement().trim()
                : question.getQuestionText().trim();

        CodingQuestion cq = question.getCodingDetails();
        if (cq == null) {
            cq = CodingQuestion.builder()
                    .question(question)
                    .build();
            question.setCodingDetails(cq);
        }

        cq.setProblemStatement(problemStatement);
        cq.setInputFormat(codingReq.getInputFormat());
        cq.setOutputFormat(codingReq.getOutputFormat());
        cq.setConstraints(codingReq.getConstraints());
        cq.setSampleInput(codingReq.getSampleInput());
        cq.setSampleOutput(codingReq.getSampleOutput());
        cq.setAllowedLanguages(StringUtils.hasText(codingReq.getAllowedLanguages()) ? codingReq.getAllowedLanguages() : "JAVA,PYTHON,CPP,C,JAVASCRIPT");
        cq.setTimeLimitMs(codingReq.getTimeLimitMs() > 0 ? codingReq.getTimeLimitMs() : 2000);
        cq.setMemoryLimitMb(codingReq.getMemoryLimitMb() > 0 ? codingReq.getMemoryLimitMb() : 256);
        cq.setStarterCodeTemplates(codingReq.getStarterCodeTemplates());

        CodingQuestion savedCq = codingQuestionRepository.save(cq);

        if (savedCq.getTestCases() == null) {
            savedCq.setTestCases(new ArrayList<>());
        } else {
            savedCq.getTestCases().clear();
        }

        if (codingReq.getTestCases() != null) {
            int order = 1;
            for (TestCaseRequest tcReq : codingReq.getTestCases()) {
                if (!StringUtils.hasText(tcReq.getExpectedOutput())) continue;
                TestCase testCase = TestCase.builder()
                        .codingQuestion(savedCq)
                        .inputData(tcReq.getInputData())
                        .expectedOutput(tcReq.getExpectedOutput().trim())
                        .isHidden(tcReq.isHidden())
                        .marksWeight(tcReq.getMarksWeight() > 0 ? tcReq.getMarksWeight() : 1.0)
                        .orderIndex(tcReq.getOrderIndex() > 0 ? tcReq.getOrderIndex() : order++)
                        .build();
                savedCq.getTestCases().add(testCase);
                testCaseRepository.save(testCase);
            }
        }
    }

    public QuestionResponse mapToAdminResponse(Question question) {
        List<QuestionOptionResponse> options = new ArrayList<>();
        if (question.getOptions() != null) {
            options = question.getOptions().stream()
                    .map(opt -> QuestionOptionResponse.builder()
                            .id(opt.getId())
                            .optionText(opt.getOptionText())
                            .isCorrect(opt.isCorrect())
                            .optionOrder(opt.getOptionOrder())
                            .build())
                    .collect(Collectors.toList());
        }

        CodingDetailsResponse codingDetails = null;
        if (question.getCodingDetails() != null) {
            CodingQuestion cq = question.getCodingDetails();
            List<TestCaseResponse> testCases = new ArrayList<>();
            if (cq.getTestCases() != null) {
                testCases = cq.getTestCases().stream()
                        .map(tc -> TestCaseResponse.builder()
                                .id(tc.getId())
                                .inputData(tc.getInputData())
                                .expectedOutput(tc.getExpectedOutput())
                                .isHidden(tc.isHidden())
                                .marksWeight(tc.getMarksWeight())
                                .orderIndex(tc.getOrderIndex())
                                .build())
                        .collect(Collectors.toList());
            }

            codingDetails = CodingDetailsResponse.builder()
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
                    .testCases(testCases)
                    .build();
        }

        return QuestionResponse.builder()
                .id(question.getId())
                .title(question.getTitle())
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType())
                .difficulty(question.getDifficulty())
                .category(question.getCategory())
                .marks(question.getMarks())
                .negativeMarks(question.getNegativeMarks())
                .explanation(question.getExplanation())
                .options(options)
                .codingDetails(codingDetails)
                .createdAt(question.getCreatedAt())
                .build();
    }
}
