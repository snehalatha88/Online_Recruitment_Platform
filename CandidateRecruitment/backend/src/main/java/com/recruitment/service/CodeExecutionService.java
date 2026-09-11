package com.recruitment.service;

import com.recruitment.dto.response.CodingExecutionResult;
import com.recruitment.dto.response.TestCaseResultItem;
import com.recruitment.entity.TestCase;
import com.recruitment.entity.enums.ExecutionStatus;
import com.recruitment.entity.enums.Language;
import com.recruitment.util.CodeSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CodeExecutionService {

    private static final Logger log = LoggerFactory.getLogger(CodeExecutionService.class);

    private final CodeSanitizer codeSanitizer;
    private final Path sandboxBaseDir;
    private final long defaultTimeoutMs;

    public CodeExecutionService(
            CodeSanitizer codeSanitizer,
            @Value("${app.sandbox.working-dir:compiler-sandbox}") String sandboxDir,
            @Value("${app.sandbox.timeout-seconds:5}") long timeoutSeconds) {
        this.codeSanitizer = codeSanitizer;
        this.sandboxBaseDir = Paths.get(sandboxDir).toAbsolutePath();
        this.defaultTimeoutMs = timeoutSeconds * 1000;

        try {
            Files.createDirectories(this.sandboxBaseDir);
        } catch (IOException e) {
            log.error("Could not initialize sandbox directory: {}", this.sandboxBaseDir, e);
        }
    }

    public CodingExecutionResult execute(Language language, String sourceCode, List<TestCase> testCases, int customTimeoutMs) {
        // Step 1: Security validation
        try {
            codeSanitizer.validateSourceCode(language, sourceCode);
        } catch (SecurityException se) {
            return CodingExecutionResult.builder()
                    .executionStatus(ExecutionStatus.SECURITY_VIOLATION)
                    .passed(false)
                    .compileErrors(se.getMessage())
                    .stderr(se.getMessage())
                    .build();
        } catch (Exception e) {
            return CodingExecutionResult.builder()
                    .executionStatus(ExecutionStatus.RUNTIME_ERROR)
                    .passed(false)
                    .compileErrors(e.getMessage())
                    .build();
        }

        // Step 2: Create isolated execution directory
        String executionId = UUID.randomUUID().toString();
        Path executionDir = sandboxBaseDir.resolve(executionId);

        try {
            Files.createDirectories(executionDir);

            // Step 3: Write code file and compile if needed
            String className = "Main";
            Path sourceFilePath;

            switch (language) {
                case JAVA -> {
                    // Extract class name if exists, default to Main
                    Pattern pattern = Pattern.compile("public\\s+class\\s+(\\w+)");
                    Matcher matcher = pattern.matcher(sourceCode);
                    if (matcher.find()) {
                        className = matcher.group(1);
                    }
                    sourceFilePath = executionDir.resolve(className + ".java");
                    Files.writeString(sourceFilePath, sourceCode, StandardCharsets.UTF_8);

                    // Compile Java
                    ProcessBuilder compilePb = new ProcessBuilder("javac", sourceFilePath.getFileName().toString());
                    compilePb.directory(executionDir.toFile());
                    Process compileProcess = compilePb.start();
                    boolean compileSuccess = compileProcess.waitFor(10, TimeUnit.SECONDS);

                    if (!compileSuccess || compileProcess.exitValue() != 0) {
                        String errors = readStream(compileProcess.getErrorStream());
                        compileProcess.destroyForcibly();
                        return CodingExecutionResult.builder()
                                .executionStatus(ExecutionStatus.COMPILATION_ERROR)
                                .passed(false)
                                .compileErrors(errors)
                                .stderr(errors)
                                .build();
                    }
                }
                case PYTHON -> {
                    sourceFilePath = executionDir.resolve("solution.py");
                    Files.writeString(sourceFilePath, sourceCode, StandardCharsets.UTF_8);
                }
                case JAVASCRIPT -> {
                    sourceFilePath = executionDir.resolve("solution.js");
                    Files.writeString(sourceFilePath, sourceCode, StandardCharsets.UTF_8);
                }
                case CPP -> {
                    sourceFilePath = executionDir.resolve("main.cpp");
                    Files.writeString(sourceFilePath, sourceCode, StandardCharsets.UTF_8);
                    ProcessBuilder compilePb = new ProcessBuilder("g++", "-O2", "main.cpp", "-o", "main.exe");
                    compilePb.directory(executionDir.toFile());
                    Process compileProcess = compilePb.start();
                    boolean compileSuccess = compileProcess.waitFor(10, TimeUnit.SECONDS);

                    if (!compileSuccess || compileProcess.exitValue() != 0) {
                        String errors = readStream(compileProcess.getErrorStream());
                        compileProcess.destroyForcibly();
                        return CodingExecutionResult.builder()
                                .executionStatus(ExecutionStatus.COMPILATION_ERROR)
                                .passed(false)
                                .compileErrors(errors)
                                .stderr(errors)
                                .build();
                    }
                }
                case C -> {
                    sourceFilePath = executionDir.resolve("main.c");
                    Files.writeString(sourceFilePath, sourceCode, StandardCharsets.UTF_8);
                    ProcessBuilder compilePb = new ProcessBuilder("gcc", "-O2", "main.c", "-o", "main.exe");
                    compilePb.directory(executionDir.toFile());
                    Process compileProcess = compilePb.start();
                    boolean compileSuccess = compileProcess.waitFor(10, TimeUnit.SECONDS);

                    if (!compileSuccess || compileProcess.exitValue() != 0) {
                        String errors = readStream(compileProcess.getErrorStream());
                        compileProcess.destroyForcibly();
                        return CodingExecutionResult.builder()
                                .executionStatus(ExecutionStatus.COMPILATION_ERROR)
                                .passed(false)
                                .compileErrors(errors)
                                .stderr(errors)
                                .build();
                    }
                }
                default -> throw new UnsupportedOperationException("Language not supported: " + language);
            }

            // Step 4: Run test cases
            long timeout = customTimeoutMs > 0 ? customTimeoutMs : defaultTimeoutMs;
            List<TestCaseResultItem> results = new ArrayList<>();
            int passedCount = 0;
            long maxExecutionTime = 0;
            ExecutionStatus overallStatus = ExecutionStatus.ACCEPTED;
            String lastStdout = "";
            String lastStderr = "";

            int index = 1;
            for (TestCase tc : testCases) {
                ProcessBuilder runPb = buildRunCommand(language, executionDir, className);
                runPb.directory(executionDir.toFile());

                long startTime = System.currentTimeMillis();
                Process runProcess = runPb.start();

                // Pipe input data
                if (tc.getInputData() != null) {
                    try (OutputStream os = runProcess.getOutputStream()) {
                        os.write(tc.getInputData().getBytes(StandardCharsets.UTF_8));
                        os.flush();
                    }
                }

                boolean finished = runProcess.waitFor(timeout, TimeUnit.MILLISECONDS);
                long execTime = System.currentTimeMillis() - startTime;
                maxExecutionTime = Math.max(maxExecutionTime, execTime);

                if (!finished) {
                    runProcess.destroyForcibly();
                    overallStatus = ExecutionStatus.TIME_LIMIT_EXCEEDED;
                    results.add(TestCaseResultItem.builder()
                            .testCaseIndex(index++)
                            .isHidden(tc.isHidden())
                            .passed(false)
                            .input(tc.isHidden() ? "<hidden>" : tc.getInputData())
                            .expectedOutput(tc.isHidden() ? "<hidden>" : tc.getExpectedOutput())
                            .errorMessage("Time Limit Exceeded (" + timeout + "ms)")
                            .executionTimeMs(execTime)
                            .status(ExecutionStatus.TIME_LIMIT_EXCEEDED)
                            .build());
                    break;
                }

                String stdout = readStream(runProcess.getInputStream());
                String stderr = readStream(runProcess.getErrorStream());
                lastStdout = stdout;
                lastStderr = stderr;

                if (runProcess.exitValue() != 0) {
                    overallStatus = ExecutionStatus.RUNTIME_ERROR;
                    results.add(TestCaseResultItem.builder()
                            .testCaseIndex(index++)
                            .isHidden(tc.isHidden())
                            .passed(false)
                            .input(tc.isHidden() ? "<hidden>" : tc.getInputData())
                            .expectedOutput(tc.isHidden() ? "<hidden>" : tc.getExpectedOutput())
                            .actualOutput(tc.isHidden() ? "<hidden>" : stdout)
                            .errorMessage(stderr.isBlank() ? "Process exited with code " + runProcess.exitValue() : stderr)
                            .executionTimeMs(execTime)
                            .status(ExecutionStatus.RUNTIME_ERROR)
                            .build());
                    break;
                }

                // Check output
                boolean isMatch = normalizeOutput(stdout).equals(normalizeOutput(tc.getExpectedOutput()));
                if (isMatch) {
                    passedCount++;
                } else if (overallStatus == ExecutionStatus.ACCEPTED) {
                    overallStatus = ExecutionStatus.WRONG_ANSWER;
                }

                results.add(TestCaseResultItem.builder()
                        .testCaseIndex(index++)
                        .isHidden(tc.isHidden())
                        .passed(isMatch)
                        .input(tc.isHidden() ? "<hidden>" : tc.getInputData())
                        .expectedOutput(tc.isHidden() ? "<hidden>" : tc.getExpectedOutput())
                        .actualOutput(tc.isHidden() ? "<hidden>" : stdout)
                        .executionTimeMs(execTime)
                        .status(isMatch ? ExecutionStatus.ACCEPTED : ExecutionStatus.WRONG_ANSWER)
                        .build());
            }

            boolean allPassed = passedCount == testCases.size() && overallStatus == ExecutionStatus.ACCEPTED;

            return CodingExecutionResult.builder()
                    .executionStatus(overallStatus)
                    .passed(allPassed)
                    .stdout(lastStdout)
                    .stderr(lastStderr)
                    .executionTimeMs(maxExecutionTime)
                    .testCasesPassed(passedCount)
                    .totalTestCases(testCases.size())
                    .testCaseResults(results)
                    .build();

        } catch (Exception e) {
            log.error("Execution error in sandbox {}", executionId, e);
            return CodingExecutionResult.builder()
                    .executionStatus(ExecutionStatus.RUNTIME_ERROR)
                    .passed(false)
                    .stderr(e.getMessage())
                    .build();
        } finally {
            // Clean up temporary workspace directory
            deleteDirectoryRecursively(executionDir);
        }
    }

    private ProcessBuilder buildRunCommand(Language language, Path dir, String className) {
        return switch (language) {
            case JAVA -> new ProcessBuilder("java", "-Xmx128m", "-cp", ".", className);
            case PYTHON -> new ProcessBuilder("python", "solution.py");
            case JAVASCRIPT -> new ProcessBuilder("node", "solution.js");
            case CPP, C -> new ProcessBuilder(dir.resolve("main.exe").toString());
        };
    }

    private String readStream(InputStream is) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[1024];
        int nRead;
        int totalRead = 0;
        int maxBytes = 64 * 1024; // 64KB max buffer to prevent OOM
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            if (totalRead + nRead > maxBytes) {
                buffer.write(data, 0, maxBytes - totalRead);
                break;
            }
            buffer.write(data, 0, nRead);
            totalRead += nRead;
        }
        return buffer.toString(StandardCharsets.UTF_8);
    }

    private String normalizeOutput(String output) {
        if (output == null) return "";
        return output.trim().replace("\r\n", "\n").replaceAll("[ \t]+$", "");
    }

    private void deleteDirectoryRecursively(Path dir) {
        try {
            if (Files.exists(dir)) {
                Files.walk(dir)
                        .sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(File::delete);
            }
        } catch (Exception e) {
            log.warn("Failed to clean up sandbox directory: {}", dir, e);
        }
    }
}
