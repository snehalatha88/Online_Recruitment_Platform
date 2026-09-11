package com.recruitment.dto.response;

import com.recruitment.entity.enums.AttemptStatus;
import com.recruitment.entity.enums.SubmissionReason;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttemptStatusResponse {
    private Long attemptId;
    private AttemptStatus status;
    private SubmissionReason submissionReason;
    private Instant startTime;
    private Instant expectedEndTime;
    private Instant submissionTime;
    private long remainingSeconds;
    private int violationCount;
    private boolean isExpired;
    private String message;
}
