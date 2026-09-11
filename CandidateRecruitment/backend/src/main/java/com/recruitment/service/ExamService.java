package com.recruitment.service;

import com.recruitment.dto.request.ExamCreateRequest;
import com.recruitment.dto.response.ExamResponse;
import com.recruitment.dto.response.QuestionResponse;
import com.recruitment.entity.Exam;
import com.recruitment.entity.ExamQuestion;
import com.recruitment.entity.Question;
import com.recruitment.entity.User;
import com.recruitment.entity.enums.ExamStatus;
import com.recruitment.exception.BadRequestException;
import com.recruitment.exception.ResourceNotFoundException;
import com.recruitment.repository.ExamQuestionRepository;
import com.recruitment.repository.ExamRepository;
import com.recruitment.repository.QuestionRepository;
import com.recruitment.repository.UserRepository;
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
public class ExamService {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final UserRepository userRepository;
    private final QuestionService questionService;
    private final AuditLogService auditLogService;

    @Transactional
    public ExamResponse createExam(ExamCreateRequest request) {
        User creator = userRepository.findById(SecurityUtils.getCurrentUserId()).orElse(null);

        Exam exam = Exam.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .instructions(request.getInstructions())
                .durationMinutes(request.getDurationMinutes())
                .passingPercentage(request.getPassingPercentage())
                .maxAttempts(request.getMaxAttempts())
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .status(request.getStatus() != null ? request.getStatus() : ExamStatus.DRAFT)
                .negativeMarkingEnabled(request.isNegativeMarkingEnabled())
                .negativeMarksPerWrong(request.getNegativeMarksPerWrong())
                .randomizeQuestions(request.isRandomizeQuestions())
                .proctoringEnabled(request.isProctoringEnabled())
                .fullScreenRequired(request.isFullScreenRequired())
                .maxViolations(request.getMaxViolations())
                .autoSubmitOnViolation(request.isAutoSubmitOnViolation())
                .createdBy(creator)
                .build();

        Exam savedExam = examRepository.save(exam);

        if (request.getQuestionIds() != null && !request.getQuestionIds().isEmpty()) {
            attachQuestions(savedExam, request.getQuestionIds());
        }

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "EXAM_CREATED",
                null, null,
                "Created exam: " + savedExam.getTitle() + " (ID: " + savedExam.getId() + ")"
        );

        return getExamById(savedExam.getId());
    }

    @Transactional
    public ExamResponse updateExam(Long id, ExamCreateRequest request) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + id));

        exam.setTitle(request.getTitle().trim());
        exam.setDescription(request.getDescription());
        exam.setInstructions(request.getInstructions());
        exam.setDurationMinutes(request.getDurationMinutes());
        exam.setPassingPercentage(request.getPassingPercentage());
        exam.setMaxAttempts(request.getMaxAttempts());
        exam.setStartDateTime(request.getStartDateTime());
        exam.setEndDateTime(request.getEndDateTime());
        if (request.getStatus() != null) {
            exam.setStatus(request.getStatus());
        }
        exam.setNegativeMarkingEnabled(request.isNegativeMarkingEnabled());
        exam.setNegativeMarksPerWrong(request.getNegativeMarksPerWrong());
        exam.setRandomizeQuestions(request.isRandomizeQuestions());
        exam.setProctoringEnabled(request.isProctoringEnabled());
        exam.setFullScreenRequired(request.isFullScreenRequired());
        exam.setMaxViolations(request.getMaxViolations());
        exam.setAutoSubmitOnViolation(request.isAutoSubmitOnViolation());

        if (request.getQuestionIds() != null) {
            examQuestionRepository.deleteByExamId(exam.getId());
            examQuestionRepository.flush();
            attachQuestions(exam, request.getQuestionIds());
        }

        Exam updatedExam = examRepository.save(exam);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "EXAM_UPDATED",
                null, null,
                "Updated exam: " + updatedExam.getTitle() + " (ID: " + updatedExam.getId() + ")"
        );

        return getExamById(updatedExam.getId());
    }

    @Transactional(readOnly = true)
    public ExamResponse getExamById(Long id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + id));
        return mapToResponse(exam, true);
    }

    @Transactional(readOnly = true)
    public Page<ExamResponse> searchExams(String query, ExamStatus status, Pageable pageable) {
        String searchQuery = StringUtils.hasText(query) ? query.trim() : null;
        return examRepository.searchExams(searchQuery, status, pageable)
                .map(e -> mapToResponse(e, false));
    }

    @Transactional
    public void updateExamStatus(Long id, ExamStatus status) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + id));

        exam.setStatus(status);
        examRepository.save(exam);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "EXAM_STATUS_CHANGED",
                null, null,
                "Changed status of exam '" + exam.getTitle() + "' to " + status
        );
    }

    @Transactional
    public void deleteExam(Long id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + id));

        String title = exam.getTitle();
        examRepository.delete(exam);

        auditLogService.logAction(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentUsername(),
                "EXAM_DELETED",
                null, null,
                "Deleted exam: " + title + " (ID: " + id + ")"
        );
    }

    private void attachQuestions(Exam exam, List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) return;
        List<Long> distinctQuestionIds = questionIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        int order = 1;
        for (Long qId : distinctQuestionIds) {
            Question question = questionRepository.findById(qId)
                    .orElseThrow(() -> new BadRequestException("Question not found with id: " + qId));

            ExamQuestion eq = ExamQuestion.builder()
                    .exam(exam)
                    .question(question)
                    .questionOrder(order++)
                    .customMarks(question.getMarks())
                    .build();

            examQuestionRepository.save(eq);
        }
        examQuestionRepository.flush();
    }

    public ExamResponse mapToResponse(Exam exam, boolean includeQuestions) {
        List<ExamQuestion> examQuestions = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(exam.getId());
        int questionCount = examQuestions.size();
        double totalMarks = examQuestions.stream()
                .mapToDouble(eq -> eq.getCustomMarks() != null ? eq.getCustomMarks() : eq.getQuestion().getMarks())
                .sum();

        List<QuestionResponse> questionResponses = new ArrayList<>();
        if (includeQuestions) {
            questionResponses = examQuestions.stream()
                    .map(eq -> questionService.mapToAdminResponse(eq.getQuestion()))
                    .collect(Collectors.toList());
        }

        return ExamResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .description(exam.getDescription())
                .instructions(exam.getInstructions())
                .durationMinutes(exam.getDurationMinutes())
                .passingPercentage(exam.getPassingPercentage())
                .maxAttempts(exam.getMaxAttempts())
                .startDateTime(exam.getStartDateTime())
                .endDateTime(exam.getEndDateTime())
                .status(exam.getStatus())
                .negativeMarkingEnabled(exam.isNegativeMarkingEnabled())
                .negativeMarksPerWrong(exam.getNegativeMarksPerWrong())
                .randomizeQuestions(exam.isRandomizeQuestions())
                .proctoringEnabled(exam.isProctoringEnabled())
                .fullScreenRequired(exam.isFullScreenRequired())
                .maxViolations(exam.getMaxViolations())
                .autoSubmitOnViolation(exam.isAutoSubmitOnViolation())
                .questionCount(questionCount)
                .totalMarks(totalMarks)
                .createdByUsername(exam.getCreatedBy() != null ? exam.getCreatedBy().getUsername() : null)
                .createdAt(exam.getCreatedAt())
                .questions(questionResponses)
                .build();
    }
}
