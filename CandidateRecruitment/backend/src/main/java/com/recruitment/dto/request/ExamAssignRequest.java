package com.recruitment.dto.request;

import jakarta.validation.constraints.NotNull;
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
public class ExamAssignRequest {

    @NotNull(message = "Exam ID is required")
    private Long examId;

    @Builder.Default
    private List<Long> candidateIds = new ArrayList<>();

    private String department;

    private Instant dueDate;
}
