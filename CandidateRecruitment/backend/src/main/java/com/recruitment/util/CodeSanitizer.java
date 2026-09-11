package com.recruitment.util;

import com.recruitment.entity.enums.Language;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class CodeSanitizer {

    private static final Pattern JAVA_BLOCKED_PATTERNS = Pattern.compile(
            "\\b(System\\.exit|Runtime\\.getRuntime\\(\\)|ProcessBuilder|java\\.lang\\.reflect|sun\\.misc|Unsafe|java\\.net\\.|java\\.nio\\.file|FileOutputStream|FileInputStream|FileReader|FileWriter|RandomAccessFile|FileChannel)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PYTHON_BLOCKED_PATTERNS = Pattern.compile(
            "\\b(subprocess|shutil|socket|requests|urllib\\.request|http\\.client|ctypes|eval\\s*\\(|exec\\s*\\(|os\\.system|os\\.popen|os\\.remove|os\\.rmdir|os\\.unlink|os\\.spawn|os\\.exec)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern CPP_BLOCKED_PATTERNS = Pattern.compile(
            "\\b(system\\s*\\(|fork\\s*\\(|exec\\w*\\s*\\(|remove\\s*\\(|unlink\\s*\\(|socket\\s*\\(|connect\\s*\\(|ofstream|ifstream|fopen|freopen)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern JS_BLOCKED_PATTERNS = Pattern.compile(
            "\\b(child_process|fs|process\\.exit|process\\.env|eval\\s*\\(|Function\\s*\\(|require\\s*\\(\\s*['\"](fs|child_process|net|http|https)['\"]\\s*\\))\\b",
            Pattern.CASE_INSENSITIVE
    );

    public void validateSourceCode(Language language, String sourceCode) {
        if (sourceCode == null || sourceCode.isBlank()) {
            throw new IllegalArgumentException("Source code cannot be empty");
        }

        switch (language) {
            case JAVA -> {
                if (JAVA_BLOCKED_PATTERNS.matcher(sourceCode).find()) {
                    throw new SecurityException("Security violation: Restricted system calls or file/network I/O detected in Java code.");
                }
            }
            case PYTHON -> {
                if (PYTHON_BLOCKED_PATTERNS.matcher(sourceCode).find()) {
                    throw new SecurityException("Security violation: Restricted system/file modules detected in Python code.");
                }
            }
            case CPP, C -> {
                if (CPP_BLOCKED_PATTERNS.matcher(sourceCode).find()) {
                    throw new SecurityException("Security violation: Restricted OS/file calls detected in C/C++ code.");
                }
            }
            case JAVASCRIPT -> {
                if (JS_BLOCKED_PATTERNS.matcher(sourceCode).find()) {
                    throw new SecurityException("Security violation: Restricted Node.js process/fs operations detected in JavaScript code.");
                }
            }
        }
    }
}
