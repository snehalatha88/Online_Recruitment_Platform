package com.recruitment.controller;

import com.recruitment.dto.request.QuestionCreateRequest;
import com.recruitment.dto.response.ApiResponse;
import com.recruitment.dto.response.QuestionResponse;
import com.recruitment.entity.enums.DifficultyLevel;
import com.recruitment.entity.enums.QuestionType;
import com.recruitment.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/questions")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminQuestionController {

    private final QuestionService questionService;

    @PostMapping
    public ResponseEntity<ApiResponse<QuestionResponse>> createQuestion(@Valid @RequestBody QuestionCreateRequest request) {
        QuestionResponse response = questionService.createQuestion(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Question created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<QuestionResponse>>> getQuestions(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) QuestionType type,
            @RequestParam(required = false) DifficultyLevel difficulty,
            @RequestParam(required = false) String category,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<QuestionResponse> questions = questionService.searchQuestions(query, type, difficulty, category, pageable);
        return ResponseEntity.ok(ApiResponse.success(questions));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> getQuestionById(@PathVariable Long id) {
        QuestionResponse response = questionService.getQuestionById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> updateQuestion(
            @PathVariable Long id,
            @Valid @RequestBody QuestionCreateRequest request) {
        QuestionResponse response = questionService.updateQuestion(id, request);
        return ResponseEntity.ok(ApiResponse.success("Question updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteQuestion(@PathVariable Long id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.ok(ApiResponse.success("Question deleted successfully", null));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        List<String> categories = questionService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }
}
