package com.recruitment.dto.request;

import com.recruitment.entity.enums.ExamStatus;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamCreateRequest {

    @NotBlank(message = "Exam title is required")
    @Size(max = 150, message = "Title cannot exceed 150 characters")
    private String title;

    private String description;

    private String instructions;

    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Max(value = 600, message = "Duration cannot exceed 600 minutes")
    @Builder.Default
    private int durationMinutes = 60;

    @DecimalMin(value = "0.0", message = "Passing percentage cannot be negative")
    @DecimalMax(value = "100.0", message = "Passing percentage cannot exceed 100")
    @Builder.Default
    private double passingPercentage = 60.0;

    @Min(value = 1, message = "Max attempts must be at least 1")
    @Builder.Default
    private int maxAttempts = 1;

    private Instant startDateTime;

    private Instant endDateTime;

    @Builder.Default
    private ExamStatus status = ExamStatus.DRAFT;

    @Builder.Default
    private boolean negativeMarkingEnabled = false;

    @Builder.Default
    private double negativeMarksPerWrong = 0.25;

    @Builder.Default
    private boolean randomizeQuestions = false;

    @Builder.Default
    private boolean proctoringEnabled = true;

    @Builder.Default
    private boolean fullScreenRequired = true;

    @Builder.Default
    private int maxViolations = 3;

    @Builder.Default
    private boolean autoSubmitOnViolation = true;

    @Builder.Default
    private List<Long> questionIds = new ArrayList<>();
}
