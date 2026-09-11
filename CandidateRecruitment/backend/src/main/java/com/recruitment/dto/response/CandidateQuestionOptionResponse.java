package com.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Stripped option response for Candidate exam interface - strictly omits isCorrect
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateQuestionOptionResponse {
    private Long id;
    private String optionText;
    private int optionOrder;
}
