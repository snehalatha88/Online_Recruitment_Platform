package com.recruitment.config;

import com.recruitment.entity.*;
import com.recruitment.entity.enums.*;
import com.recruitment.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final CodingQuestionRepository codingQuestionRepository;
    private final TestCaseRepository testCaseRepository;
    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final ProctoringViolationRepository proctoringViolationRepository;
    private final AnswerRepository answerRepository;
    private final CodingSubmissionRepository codingSubmissionRepository;
    private final ExamResultRepository examResultRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and initializing system database default data...");

        // 1. Roles
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).build()));

        Role candidateRole = roleRepository.findByName(RoleName.ROLE_CANDIDATE)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_CANDIDATE).build()));

        // 2. Admin User (username: admin, password: admin123)
        User adminUser = userRepository.findByUsername("admin").orElse(null);
        if (adminUser == null) {
            adminUser = User.builder()
                    .username("admin")
                    .email("admin@recruitment.corp")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role(adminRole)
                    .status(UserStatus.ACTIVE)
                    .build();
            adminUser = userRepository.save(adminUser);
            log.info("Created default Admin user: admin / admin123");
        } else {
            adminUser.setPasswordHash(passwordEncoder.encode("admin123"));
            adminUser.setRole(adminRole);
            adminUser.setStatus(UserStatus.ACTIVE);
            adminUser = userRepository.save(adminUser);
            log.info("Updated Admin user: admin / admin123");
        }

        // 3. User & Question persistence (candidates created by admin are preserved across restarts)

        // 4. Question Bank
        if (questionRepository.count() == 0) {
            log.info("Seeding question bank...");
            List<Question> seededQuestions = seedQuestionBank();

            // 5. Default Examinations
            Exam exam1 = Exam.builder()
                    .title("Java Backend Assessment 2026")
                    .description("Comprehensive technical evaluation covering Java fundamentals, OOP principles, collections, Spring Boot, and algorithmic coding.")
                    .instructions("1. This is a proctored technical examination.\n2. Switching tabs, losing window focus, or exiting full screen will be recorded as violations.\n3. Ensure your camera and browser are uninterrupted.\n4. Complete all MCQs and the coding challenge before the countdown timer expires.")
                    .durationMinutes(60)
                    .passingPercentage(60.0)
                    .maxAttempts(1)
                    .startDateTime(Instant.now().minus(1, ChronoUnit.DAYS))
                    .endDateTime(Instant.now().plus(30, ChronoUnit.DAYS))
                    .status(ExamStatus.PUBLISHED)
                    .negativeMarkingEnabled(true)
                    .negativeMarksPerWrong(0.25)
                    .randomizeQuestions(false)
                    .proctoringEnabled(true)
                    .fullScreenRequired(true)
                    .maxViolations(3)
                    .autoSubmitOnViolation(true)
                    .createdBy(adminUser)
                    .build();
            exam1 = examRepository.save(exam1);

            int order = 1;
            for (Question q : seededQuestions) {
                ExamQuestion eq = ExamQuestion.builder()
                        .exam(exam1)
                        .question(q)
                        .questionOrder(order++)
                        .customMarks(q.getMarks())
                        .build();
                examQuestionRepository.save(eq);
            }

            log.info("Database initialized successfully with default assessment and questions.");
        }
    }

    private List<Question> seedQuestionBank() {
        List<Question> list = new ArrayList<>();

        // MCQ 1
        Question q1 = Question.builder()
                .title("Java Inheritance Keyword")
                .questionText("Which keyword is used in Java to inherit a class?")
                .questionType(QuestionType.MCQ)
                .difficulty(DifficultyLevel.EASY)
                .category("Java Core")
                .marks(2.0)
                .negativeMarks(0.5)
                .explanation("In Java, the 'extends' keyword is used to inherit the properties and behaviors of a parent class.")
                .build();
        q1 = questionRepository.save(q1);
        optionRepository.save(QuestionOption.builder().question(q1).optionText("implements").isCorrect(false).optionOrder(1).build());
        optionRepository.save(QuestionOption.builder().question(q1).optionText("extends").isCorrect(true).optionOrder(2).build());
        optionRepository.save(QuestionOption.builder().question(q1).optionText("inherits").isCorrect(false).optionOrder(3).build());
        optionRepository.save(QuestionOption.builder().question(q1).optionText("super").isCorrect(false).optionOrder(4).build());
        list.add(q1);

        // MCQ 2
        Question q2 = Question.builder()
                .title("Java Collection Uniqueness")
                .questionText("Which of the following Java Collection interfaces or implementations does NOT allow duplicate elements?")
                .questionType(QuestionType.MCQ)
                .difficulty(DifficultyLevel.EASY)
                .category("Java Collections")
                .marks(2.0)
                .negativeMarks(0.5)
                .explanation("The Set interface and its implementations like HashSet do not allow duplicate elements.")
                .build();
        q2 = questionRepository.save(q2);
        optionRepository.save(QuestionOption.builder().question(q2).optionText("ArrayList").isCorrect(false).optionOrder(1).build());
        optionRepository.save(QuestionOption.builder().question(q2).optionText("HashSet").isCorrect(true).optionOrder(2).build());
        optionRepository.save(QuestionOption.builder().question(q2).optionText("LinkedList").isCorrect(false).optionOrder(3).build());
        optionRepository.save(QuestionOption.builder().question(q2).optionText("Vector").isCorrect(false).optionOrder(4).build());
        list.add(q2);

        // MCQ 3
        Question q3 = Question.builder()
                .title("Spring Boot Stereotype Annotation")
                .questionText("Which annotation is typically used in Spring Boot to indicate that an annotated class is a 'Service' layer component?")
                .questionType(QuestionType.MCQ)
                .difficulty(DifficultyLevel.EASY)
                .category("Spring Boot")
                .marks(2.0)
                .negativeMarks(0.5)
                .explanation("@Service is a specialization of the @Component annotation used in the service layer.")
                .build();
        q3 = questionRepository.save(q3);
        optionRepository.save(QuestionOption.builder().question(q3).optionText("@Controller").isCorrect(false).optionOrder(1).build());
        optionRepository.save(QuestionOption.builder().question(q3).optionText("@Repository").isCorrect(false).optionOrder(2).build());
        optionRepository.save(QuestionOption.builder().question(q3).optionText("@Service").isCorrect(true).optionOrder(3).build());
        optionRepository.save(QuestionOption.builder().question(q3).optionText("@Entity").isCorrect(false).optionOrder(4).build());
        list.add(q3);

        // Multiple Answer 1
        Question q4 = Question.builder()
                .title("Java Access Modifiers")
                .questionText("Which of the following are valid access modifiers in the Java programming language? (Select all that apply)")
                .questionType(QuestionType.MULTIPLE_ANSWER)
                .difficulty(DifficultyLevel.MEDIUM)
                .category("Java Core")
                .marks(3.0)
                .negativeMarks(0.75)
                .explanation("Java provides four access levels: public, protected, package-private (default), and private. 'internal' and 'friend' are from other languages.")
                .build();
        q4 = questionRepository.save(q4);
        optionRepository.save(QuestionOption.builder().question(q4).optionText("public").isCorrect(true).optionOrder(1).build());
        optionRepository.save(QuestionOption.builder().question(q4).optionText("private").isCorrect(true).optionOrder(2).build());
        optionRepository.save(QuestionOption.builder().question(q4).optionText("protected").isCorrect(true).optionOrder(3).build());
        optionRepository.save(QuestionOption.builder().question(q4).optionText("internal").isCorrect(false).optionOrder(4).build());
        list.add(q4);

        // Multiple Answer 2
        Question q5 = Question.builder()
                .title("HTTP Success Status Codes")
                .questionText("Which of the following HTTP status codes represent successful responses in REST APIs? (Select all that apply)")
                .questionType(QuestionType.MULTIPLE_ANSWER)
                .difficulty(DifficultyLevel.MEDIUM)
                .category("Web & REST")
                .marks(3.0)
                .negativeMarks(0.75)
                .explanation("200 (OK), 201 (Created), and 204 (No Content) are standard 2xx success codes. 404 is client error and 500 is server error.")
                .build();
        q5 = questionRepository.save(q5);
        optionRepository.save(QuestionOption.builder().question(q5).optionText("200 OK").isCorrect(true).optionOrder(1).build());
        optionRepository.save(QuestionOption.builder().question(q5).optionText("201 Created").isCorrect(true).optionOrder(2).build());
        optionRepository.save(QuestionOption.builder().question(q5).optionText("204 No Content").isCorrect(true).optionOrder(3).build());
        optionRepository.save(QuestionOption.builder().question(q5).optionText("404 Not Found").isCorrect(false).optionOrder(4).build());
        list.add(q5);

        // Coding Question 1: Find Largest Number in an Array
        Question q6 = Question.builder()
                .title("Find Maximum Element in Array")
                .questionText("Given an array of integers, write a program to find and print the maximum value.")
                .questionType(QuestionType.CODING)
                .difficulty(DifficultyLevel.MEDIUM)
                .category("Data Structures & Algorithms")
                .marks(10.0)
                .negativeMarks(0.0)
                .explanation("Iterate through the array elements keeping track of the running maximum value.")
                .build();
        q6 = questionRepository.save(q6);

        String starterJava = """
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            int val = scanner.nextInt();
            if (val > max) {
                max = val;
            }
        }
        System.out.println(max);
    }
}
""";

        String starterPy = """
import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:n+1]]
    print(max(nums))

if __name__ == '__main__':
    main()
""";

        CodingQuestion cq = CodingQuestion.builder()
                .question(q6)
                .problemStatement("Given an integer $N$ followed by $N$ space-separated integers, determine and print the maximum integer in the array.")
                .inputFormat("The first line contains an integer $N$ (the number of elements).\nThe second line contains $N$ space-separated integers.")
                .outputFormat("Print a single integer representing the maximum value.")
                .constraints("1 <= N <= 10^5\n-10^9 <= A[i] <= 10^9")
                .sampleInput("5\n10 45 2 99 30")
                .sampleOutput("99")
                .allowedLanguages("JAVA,PYTHON,CPP,JAVASCRIPT")
                .timeLimitMs(2000)
                .memoryLimitMb(256)
                .starterCodeTemplates("{\"JAVA\":\"" + starterJava.replace("\"", "\\\"").replace("\n", "\\n") + "\",\"PYTHON\":\"" + starterPy.replace("\"", "\\\"").replace("\n", "\\n") + "\"}")
                .build();
        cq = codingQuestionRepository.save(cq);

        // Test Cases (Public + Hidden)
        testCaseRepository.save(TestCase.builder().codingQuestion(cq).inputData("5\n10 45 2 99 30").expectedOutput("99").isHidden(false).marksWeight(1.0).orderIndex(1).build());
        testCaseRepository.save(TestCase.builder().codingQuestion(cq).inputData("3\n-5 -2 -10").expectedOutput("-2").isHidden(false).marksWeight(1.0).orderIndex(2).build());
        testCaseRepository.save(TestCase.builder().codingQuestion(cq).inputData("1\n42").expectedOutput("42").isHidden(true).marksWeight(1.0).orderIndex(3).build());
        testCaseRepository.save(TestCase.builder().codingQuestion(cq).inputData("6\n100 200 50 800 300 150").expectedOutput("800").isHidden(true).marksWeight(1.0).orderIndex(4).build());

        list.add(q6);
        return list;
    }
}
