package com.recruitment.dto.response;

import com.recruitment.entity.enums.ViolationAction;
import com.recruitment.entity.enums.ViolationSeverity;
import com.recruitment.entity.enums.ViolationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProctoringViolationResponse {
    private Long id;
    private Long attemptId;
    private Long candidateId;
    private String candidateFullName;
    private String candidateCode;
    private ViolationType violationType;
    private Instant timestamp;
    private String description;
    private ViolationSeverity severity;
    private ViolationAction actionTaken;
}
