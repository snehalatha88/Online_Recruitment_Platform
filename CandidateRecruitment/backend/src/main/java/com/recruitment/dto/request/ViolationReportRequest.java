package com.recruitment.dto.request;

import com.recruitment.entity.enums.ViolationSeverity;
import com.recruitment.entity.enums.ViolationType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViolationReportRequest {

    @NotNull(message = "Violation type is required")
    private ViolationType violationType;

    private String description;

    @Builder.Default
    private ViolationSeverity severity = ViolationSeverity.MEDIUM;
}
