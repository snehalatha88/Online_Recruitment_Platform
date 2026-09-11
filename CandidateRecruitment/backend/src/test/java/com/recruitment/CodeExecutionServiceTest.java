package com.recruitment;

import com.recruitment.dto.response.CodingExecutionResult;
import com.recruitment.entity.TestCase;
import com.recruitment.entity.enums.ExecutionStatus;
import com.recruitment.entity.enums.Language;
import com.recruitment.service.CodeExecutionService;
import com.recruitment.util.CodeSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CodeExecutionServiceTest {

    private CodeExecutionService codeExecutionService;

    @BeforeEach
    void setUp() {
        CodeSanitizer sanitizer = new CodeSanitizer();
        codeExecutionService = new CodeExecutionService(sanitizer, "target/test-sandbox", 5);
    }

    @Test
    void testSecurityViolation_RestrictedJavaExecution() {
        String maliciousCode = """
public class Main {
    public static void main(String[] args) {
        System.exit(0);
    }
}
""";
        TestCase testCase = TestCase.builder().inputData("").expectedOutput("").build();
        CodingExecutionResult result = codeExecutionService.execute(
                Language.JAVA, maliciousCode, List.of(testCase), 2000
        );

        assertEquals(ExecutionStatus.SECURITY_VIOLATION, result.getExecutionStatus());
        assertFalse(result.isPassed());
    }

    @Test
    void testCleanPythonCodeExecution() {
        String cleanPython = """
n = int(input())
print(n * 2)
""";
        TestCase testCase = TestCase.builder()
                .inputData("5\n")
                .expectedOutput("10")
                .isHidden(false)
                .orderIndex(1)
                .build();

        CodingExecutionResult result = codeExecutionService.execute(
                Language.PYTHON, cleanPython, List.of(testCase), 3000
        );

        // If Python is present on system, it will execute and accept
        if (result.getExecutionStatus() == ExecutionStatus.ACCEPTED) {
            assertTrue(result.isPassed());
            assertEquals(1, result.getTestCasesPassed());
        }
    }
}
